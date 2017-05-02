/*
 * message.js
 * This file contains your bot code
 */

const recastai = require('recastai')
const slackify = require('slackify-html');
const axios = require('axios')
const axios_client = axios.create({
  baseURL: 'https://api.stackexchange.com/2.2/',
  params: {
    site: 'stackoverflow',
    order: 'desc'
  }
})

// This function is the core of the bot behaviour
const replyMessage = (message) => {
  // Instantiate Recast.AI SDK, just for request service
  const request = new recastai.request(process.env.REQUEST_TOKEN, process.env.LANGUAGE)
  // Get text from message received
  const text = message.content

  console.log('I receive: ', text)

  // Get senderId to catch unique conversation_token
  const senderId = message.senderId

  // Call Recast.AI SDK, through /converse route
  request.converseText(text, { conversationToken: senderId })
  .then(result => {

    if (result.action) {
      console.log('The conversation action is: ', result.action.slug)
    }

    if (result.intents[0].slug == 'so-question') {
        console.log('Sending question "' + result.source + '" to stack overflow')

        var answer_ids = []
        var answers = []
        axios_client.get('search/advanced?sort=relevance&q=' + result.source)
        .then(response => {
          response.data.items.forEach(item => {
            if (item.accepted_answer_id) {
              answer_ids.push(item.accepted_answer_id);
            }
          })

          axios_client.get('answers/' + answer_ids.join(';') + '?filter=!bJDus)cXjL7zo1')
          .then(response => {
            answer_ids.forEach(id => {
              answers.push(response.data.items.filter(item => { return item.answer_id == id })[0])
            })

            if (answers.length > 0) {
              message.addReply({ type: 'text', content: 'Here are the best answers from stack overflow:' })

              var i = 0
              while (i < 5 && i < answers.length) {
                message.addReply({ type: 'text', content: slackify(answers[i].body) })
                i += 1
              }
            } else {
              message.addReply({ type: 'text', content: 'No answer found on stack overflow for your question' })
            }

            // FIXME: duplicated
            message.reply()
            .then(() => {
              // Do some code after sending messages
            })
            .catch(err => {
              console.error('Error while sending message to channel', err)
            })
          })
        })

    } else {
      // If there is not any message return by Recast.AI for this current conversation
      if (!result.replies.length) {
        message.addReply({ type: 'text', content: 'I don\'t have the reply to this yet :)' })
      } else {
        // Add each reply received from API to replies stack
        result.replies.forEach(replyContent => message.addReply({ type: 'text', content: replyContent }))
      }

      // Send all replies
      message.reply()
      .then(() => {
        // Do some code after sending messages
      })
      .catch(err => {
        console.error('Error while sending message to channel', err)
      })
    }
  })
  .catch(err => {
    console.error('Error while sending message to Recast.AI', err)
  })
}

module.exports = replyMessage
