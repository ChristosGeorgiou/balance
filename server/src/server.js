import express from 'express';
import { buildSchema, execute, subscribe } from 'graphql';
import { PubSub } from 'graphql-subscriptions';
import { createServer } from 'http';
import * as path from 'path';
import { SubscriptionServer } from 'subscriptions-transport-ws';
const graphqlHTTP = require('express-graphql');
const cors = require('cors');

const GRAPHQL_PORT = 10102;
const GRAPHQL_PATH = '/graphql';
const GRAPHQL_SUBSCRIPTION_PORT = 10103;
const GRAPHQL_SUBSCRIPTION_PATH = '/subscriptions';

function log(msg) {
  const prefix = '# GraphQL Server: ';
  if (typeof msg === 'string')
    console.log(prefix + msg);
  else console.log(prefix + JSON.stringify(msg, null, 2));
}

function sortByUpdatedAtAndPrimary(a, b) {
  if (a.updatedAt > b.updatedAt) return 1;
  if (a.updatedAt < b.updatedAt) return -1;

  if (a.updatedAt === b.updatedAt) {
    if (a._id > b._id) return 1;
    if (a._id < b._id) return -1;
    else return 0;
  }
}

export async function run() {
  let boards = [];
  let messages = [];
  const app = express();
  app.use(cors());

  const schema = buildSchema(`
    type Query {
        info: Int
        feedBoards(lastId: String!, minUpdatedAt: Int!, limit: Int!): [Board!]!
        feedMessages(lastId: String!, minUpdatedAt: Int!, limit: Int!): [Message!]!
    }
    type Mutation {
      setBoard(doc: inputBoard): Board
      setMessage(doc: inputMessage): Message
    }
    input inputBoard {
        _id: ID!,
        name: String,
        created: Float,
        avatar: String,
        updatedAt: Float,
        deleted: Boolean
    }
    type Board {
      _id: ID!,
      name: String,
      created: Float,
      avatar: String,
      updatedAt: Float,
      deleted: Boolean
    }

    input inputMessage {
      _id: ID!,
      timestamp: Float,
      text: String,
      data: String,
      sender: String,
      board: String,
      status: String,
      type: String,
      updatedAt: Float,
      deleted: Boolean
    }
    type Message {
      _id: ID!,
      timestamp: Float,
      text: String,
      data: String,
      sender: String,
      board: String,
      status: String,
      type: String,
      updatedAt: Float,
      deleted: Boolean
    }

    type Subscription {
        boardChanged: Board
        messageChanged: Message
    }
    schema {
        query: Query
        mutation: Mutation
        subscription: Subscription
    }
    `);

  const pubsub = new PubSub();

  // The root prov_ides a resolver function for each API endpoint
  const root = {
    info: () => 1,
    feedBoards: args => {
      log('## feedBoards()', args);
      // sorted by updatedAt and primary
      const sortedDocuments = boards.sort(sortByUpdatedAtAndPrimary);

      // only return where updatedAt >= minUpdatedAt
      const filterForMinUpdatedAtAndId = sortedDocuments.filter(doc => {
        if (doc.updatedAt < args.minUpdatedAt) return false;
        if (doc.updatedAt > args.minUpdatedAt) return true;
        if (doc.updatedAt === args.minUpdatedAt) {
          if (doc._id > args.lastId) return true;
          else return false;
        }
      });

      // limit
      const limited = filterForMinUpdatedAtAndId.slice(0, args.limit);
      return limited;
    },
    feedMessages: args => {
      log('## feedMessages()', args);
      // sorted by updatedAt and primary
      const sortedDocuments = messages.sort(sortByUpdatedAtAndPrimary);

      // only return where updatedAt >= minUpdatedAt
      const filterForMinUpdatedAtAndId = sortedDocuments.filter(doc => {
        if (doc.updatedAt < args.minUpdatedAt) return false;
        if (doc.updatedAt > args.minUpdatedAt) return true;
        if (doc.updatedAt === args.minUpdatedAt) {
          if (doc._id > args.lastId) return true;
          else return false;
        }
      });

      // limit
      const limited = filterForMinUpdatedAtAndId.slice(0, args.limit);
      return limited;
    },
    setBoard: args => {
      log('## setBoard()', args);
      const doc = args.doc;
      boards = boards.filter(d => d._id !== doc._id);
      doc.updatedAt = Math.round(new Date().getTime() / 1000);
      boards.push(doc);

      pubsub.publish(
        'boardChanged',
        {
          boardChanged: doc
        }
      );
      log('published boardChanged ' + doc._id);

      return doc;
    },
    setMessage: args => {
      log('## setMessage()', args);
      const doc = args.doc;
      messages = messages.filter(d => d._id !== doc._id);
      doc.updatedAt = Math.round(new Date().getTime() / 1000);
      messages.push(doc);

      pubsub.publish(
        'messageChanged',
        {
          messageChanged: doc
        }
      );
      log('published messageChanged ' + doc._id);

      return doc;
    }
  };

  // server multitab.html - used in the e2e test
  app.use('/static', express.static(path.join(__dirname, '/static')));

  // server graphql-endpoint
  app.use(GRAPHQL_PATH, graphqlHTTP({
    schema: schema,
    rootValue: root,
    graphiql: true,
  }));


  const server = app.listen(GRAPHQL_PORT, function () {
    log('Started graphql-endpoint at http://localhost:' +
      GRAPHQL_PORT + GRAPHQL_PATH
    );
  });


  const appSubscription = express();
  const serverSubscription = createServer(appSubscription);
  serverSubscription.listen(GRAPHQL_SUBSCRIPTION_PORT, () => {
    log(
      'Started graphql-subscription endpoint at http://localhost:' +
      GRAPHQL_SUBSCRIPTION_PORT + GRAPHQL_SUBSCRIPTION_PATH
    );
    const subServer = new SubscriptionServer(
      {
        execute,
        subscribe,
        schema,
        rootValue: {
          boardChanged: pubsub.asyncIterator('boardChanged'),
          messageChanged: pubsub.asyncIterator('messageChanged')
        }
      },
      {
        server: serverSubscription,
        path: GRAPHQL_SUBSCRIPTION_PATH,
      }
    );
  });


  // comment this in for testing of the subscriptions
  /*
  setInterval(() => {
      pubsub.publish(
          'boardChanged',
          {
              boardChanged: {
                  _id: 'foobar'
              }
          }
      );
      console.log('published boardChanged');
  }, 1000); */
}

run();
