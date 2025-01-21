/* eslint-disable max-len */
import { Context } from 'cordis'
import { Config } from '../index.ts'
import jwt from 'koa-jwt'
import { getMessageContent, sha1 } from '@chatluna/utils'
import type {} from '@chatluna/memory/service'
import type {} from '@chatluna/assistant/service'
import {
    ChatLunaConversationTemplate,
    ChatLunaConversationUser
} from '@chatluna/memory/types'
import { ModelType } from '@chatluna/core/platform'
import { SystemMessage, HumanMessage } from '@langchain/core/messages'

export function apply(ctx: Context, config: Config) {
    ctx.server.get(
        `${config.path}/v1/conversation/list`,
        jwt({ secret: sha1(config.rootPassword) }),
        async (koa) => {
            const { bindId } = koa.state.user as {
                bindId: string
            }

            const conversations = await ctx.chatluna_conversation
                .queryConversationsByUser(bindId)
                .then((conversations) =>
                    conversations.map(([conversation]) => conversation)
                )

            const body = {
                code: 0,
                data: conversations
            }

            koa.set('Content-Type', 'application/json')
            koa.body = JSON.stringify(body)
            koa.status = 200
        }
    )

    ctx.server.delete(
        `${config.path}/v1/conversation/delete/:id`,
        jwt({ secret: sha1(config.rootPassword) }),
        async (koa) => {
            const { bindId } = koa.state.user as {
                bindId: string
            }

            const conversationId = koa.params.id

            const conversation =
                await ctx.chatluna_conversation.resolveUserConversation(
                    bindId,
                    conversationId
                )
            koa.set('Content-Type', 'application/json')

            if (conversation.userId !== bindId) {
                koa.body = JSON.stringify({
                    code: 400,
                    message: 'Permission denied'
                })
                koa.status = 400
                return
            }

            try {
                await ctx.chatluna_conversation.deleteConversation(
                    conversationId
                )
                koa.body = JSON.stringify({
                    code: 0
                })
                koa.status = 200
            } catch (e) {
                koa.body = JSON.stringify({
                    code: 400,
                    message: 'Failed to delete conversation'
                })
                koa.status = 400
                ctx.logger.error(e)
            }
        }
    )

    ctx.server.get(
        `${config.path}/v1/conversation/info/:id`,
        jwt({ secret: sha1(config.rootPassword) }),
        async (koa) => {
            const { bindId } = koa.state.user as {
                bindId: string
            }

            const conversationId = koa.params.id

            const conversation =
                await ctx.chatluna_conversation.resolveUserConversation(
                    bindId,
                    conversationId
                )
            koa.set('Content-Type', 'application/json')

            if (conversation.userId !== bindId) {
                koa.body = JSON.stringify({
                    code: 400,
                    message: 'Permission denied'
                })
                koa.status = 400
                return
            }

            try {
                const resp =
                    await ctx.chatluna_conversation.resolveConversation(
                        conversationId
                    )
                koa.body = JSON.stringify({
                    code: 0,
                    data: resp
                })
                koa.status = 200
            } catch (e) {
                koa.body = JSON.stringify({
                    code: 400,
                    message: 'Failed to get conversation info'
                })
                koa.status = 400
                ctx.logger.error(e)
            }
        }
    )

    ctx.server.post(
        `${config.path}/v1/conversation/create`,
        jwt({ secret: sha1(config.rootPassword) }),
        async (koa) => {
            // TODO: check model permission for user(check when chat)

            const { bindId } = koa.state.user as {
                bindId: string
            }

            const {
                conversation: conversationTemplate,
                additional: conversationAdditional
            } = koa.request.body as {
                conversation: ChatLunaConversationTemplate
                additional: Omit<ChatLunaConversationUser, 'conversationId'>
            }

            koa.set('Content-Type', 'application/json')

            conversationAdditional.userId = bindId

            const assistant = await ctx.chatluna_assistant.getAssistantById(
                bindId,
                conversationTemplate.assistantId
            )

            if (assistant == null) {
                koa.body = JSON.stringify({
                    code: 400,
                    message: `The assistant id ${conversationTemplate.assistantId} is not fount`
                })
                koa.status = 400
                return
            }

            if (conversationAdditional.assistant !== assistant.name) {
                koa.body = JSON.stringify({
                    code: 400,
                    message: `The assistant name ${conversationAdditional.assistant} is not match`
                })
                koa.status = 400
            }

            try {
                const conversation =
                    await ctx.chatluna_conversation.createConversation(
                        conversationTemplate,
                        conversationAdditional
                    )

                koa.body = JSON.stringify({
                    code: 0,
                    data: conversation
                })
                koa.status = 200
            } catch (e) {
                koa.body = JSON.stringify({
                    code: 400,
                    message: 'Failed to create conversation'
                })
                koa.status = 400
                ctx.logger.error(e)
            }
        }
    )

    ctx.server.get(
        `${config.path}/v1/conversation/summary-title/:id`,
        jwt({ secret: sha1(config.rootPassword) }),
        async (koa) => {
            const { bindId } = koa.state.user as {
                bindId: string
            }

            const conversationId = koa.params.id

            const userConversation =
                await ctx.chatluna_conversation.resolveUserConversation(
                    conversationId
                )
            koa.set('Content-Type', 'application/json')

            if (userConversation.userId !== bindId) {
                koa.body = JSON.stringify({
                    code: 400,
                    message: 'Permission denied'
                })
                koa.status = 400
                return
            }

            const conversation =
                await ctx.chatluna_conversation.resolveConversation(
                    conversationId
                )

            const assistant = await ctx.chatluna_assistant.getAssistantById(
                bindId,
                conversation.assistantId
            )

            if (assistant == null) {
                koa.body = JSON.stringify({
                    code: 400,
                    message: `The assistant id ${conversation.assistantId} is not fount`
                })
                koa.status = 400
                return
            }

            const modelName = conversation.model ?? assistant.model

            const model = await ctx.chatluna_platform.randomModel(
                modelName,
                ModelType.llm
            )

            const preset = await ctx.chatluna_preset.getPreset(assistant.preset)

            const messages = await ctx.chatluna_conversation
                .fetchAllMessages(conversationId)
                .then((messages) =>
                    messages.map((message) => {
                        return `<${message.role}>${message.content}</${message.role}>`
                    })
                )

            const summaryTitlePrompt = SUMMARY_TITLE_PROMPT_LIST.map(
                (prompt, index) => {
                    if (index === 0) {
                        return new SystemMessage(prompt)
                    }

                    return new HumanMessage(
                        prompt
                            .replaceAll('{conversation}', messages.join('\n'))
                            .replaceAll(
                                '{systemInstruction}',
                                preset.messages
                                    .map(
                                        (message) =>
                                            `<${message.getType()}> ${message.content} </${message.getType()}>`
                                    )
                                    .join('\n')
                            )
                    )
                }
            )

            try {
                const summaryTitle = await model
                    .invoke(summaryTitlePrompt)
                    .then((message) => getMessageContent(message.content))

                await ctx.chatluna_conversation.updateConversation(
                    conversationId,
                    {
                        title: summaryTitle
                    }
                )

                const newConversation =
                    await ctx.chatluna_conversation.resolveConversation(
                        conversationId
                    )

                koa.body = JSON.stringify({
                    code: 0,
                    data: newConversation
                })
                koa.status = 200
            } catch (e) {
                koa.body = JSON.stringify({
                    code: 400,
                    message: 'Failed to get conversation info'
                })
                koa.status = 400
                ctx.logger.error(e)
            }
        }
    )
}

const SUMMARY_TITLE_PROMPT_LIST = [
    `You are an assistant who is good at conversations. You need to summarize the user's conversation into a title of 6 words or less. The title does not need to contain punctuation marks.
If the conversation contains system instructions, you can refer to the content of the system instructions to name it appropriately.
The title text needs to be output in the user conversation language.
The content in the \`<conversation></conversation>\` tag is the conversation, the content in the \`<systemInstruction></systemInstruction>\` tag is the system instruction of the conversation. The labels here are only used to limit the data range. Do not output any label elements.
`,
    `
<conversation>
{conversation}
</conversation>

<systemInstruction>
{systemInstruction}
</systemInstruction>

<rules-guidelines>
- Do not wrap it in any XML tags when you see in this prompt.
</rules-guidelines>
`
]
