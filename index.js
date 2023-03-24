import { ApolloServer } from '@apollo/server'
import { startStandaloneServer } from '@apollo/server/standalone'

import express from 'express'

import jwt from 'jsonwebtoken'
const SECRET_KEY = 'miClaveSecreta'

const generateToken = (user) => {
  const token = jwt.sign({ userId: user.id }, SECRET_KEY, { expiresIn: '1h' })
  return token
}

const validateToken = async (tokenHeader) => {
  // Verificar que req y req.headers existan
  //const authHeader = req.headers.authorization
  //const token = tokenHeader.split('Bearer ')[1]
  try {
    const { userId } = jwt.verify(tokenHeader, SECRET_KEY)
    if (userId) {
      return userId
    } else return undefined
  } catch (e) {
    console.log(e)
  }
}

// A schema is a collection of type definitions (hence "typeDefs")
// that together define the "shape" of queries that are executed against
// your data.
const typeDefs = `#graphql
  # Comments in GraphQL strings (such as this one) start with the hash (#) symbol.

  # This "Book" type defines the queryable fields for every book in our data source.
  type Book {
    title: String
    author: String
  }

  type Token {
    token: String
  }

  # The "Query" type is special: it lists all of the available queries that
  # clients can execute, along with the return type for each. In this
  # case, the "books" query returns an array of zero or more Books (defined above).
  type Query {
    books: [Book]
    login(username: String, password: String ): Token
  }
`

const users = [
  {
    id: 1,
    username: 'test@gmail.com',
    password: '12345',
    roles: ['superAdmin'],
  },
  {
    id: 2,
    username: 'test2@gmail.com',
    password: '12345',
    roles: ['admin'],
  },
]
const books = [
  {
    title: 'The Awakening',
    author: 'Kate Chopin',
  },
  {
    title: 'City of Glass',
    author: 'Paul Auster',
  },
]

const validateUser = async (username, password) => {
  return users.find((user) => user.username === username && user.password)
}

// Resolvers define how to fetch the types defined in your schema.
// This resolver retrieves books from the "books" array above.
const resolvers = {
  Query: {
    books: (parent, args, contextValue) => {
      console.log('en el books query--->', contextValue)
      const user = users.find((user) => user.id === contextValue.user)
      if (user.roles.includes('superAdmin')) {
        return books
      }
      throw new Error('Need super admin permisions')
    },
    login: async (parent, { username, password }, contextValue) => {
      // Validar las credenciales del usuario
      console.log('en el login query--->', contextValue)
      const isValidUser = await validateUser(username, password)
      if (!isValidUser) {
        throw new Error('Invalid credentials')
      }

      // Generar un token JWT y devolverlo en la respuesta
      const user = { id: isValidUser.id, username }
      const token = generateToken(user)
      return { token }
    },
  },
}

// The ApolloServer constructor requires two parameters: your schema
// definition and your set of resolvers.
const server = new ApolloServer({
  typeDefs,
  resolvers,
})

const { url } = await startStandaloneServer(server, {
  // Note: This example uses the `req` argument to access headers,
  // but the arguments received by `context` vary by integration.
  // This means they vary for Express, Fastify, Lambda, etc.

  // For `startStandaloneServer`, the `req` and `res` objects are
  // `http.IncomingMessage` and `http.ServerResponse` types.
  context: async ({ req }) => {
    if (req.headers.authorization) {
      const user = await validateToken(req.headers.authorization)
      console.log('userssssss', user)
      if (user) {
        return { user: user }
      } else {
        throw new Error('Invalid token')
      }
    } else {
      return { user: 'hola' }
    }
  },
})

console.log(`🚀 Server listening at: ${url}`)
