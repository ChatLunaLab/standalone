import { Context } from 'cordis'
import { Config } from '../index.ts'
import jwt from 'koa-jwt'
import { sha1 } from '@chatluna/utils'
import type {} from '@chatluna/memory/service'
import type {} from '@chatluna/assistant/service'
import { ChatLunaAssistant } from '@chatluna/memory/types'

export function apply(ctx: Context, config: Config) {
    ctx.server.get(
        `${config.path}/v1/assistant/list`,
        jwt({ secret: sha1(config.rootPassword) }),
        async (koa) => {
            const { bindId } = koa.state.user as {
                bindId: string
            }

            const assistants =
                await ctx.chatluna_conversation.getAllAssistant(bindId)

            const body = {
                code: 0,
                data: assistants
            }

            koa.set('Content-Type', 'application/json')
            koa.body = JSON.stringify(body)
            koa.status = 200
        }
    )

    ctx.server.get(
        `${config.path}/v1/assistant/info/:name`,
        jwt({ secret: sha1(config.rootPassword) }),
        async (koa) => {
            const { bindId } = koa.state.user as {
                bindId: string
            }

            let assistantName: string | number = koa.params.name

            try {
                assistantName = parseInt(assistantName as string)
            } catch (e) {
                // ignore
            }

            let assistant: ChatLunaAssistant | null = null

            try {
                if (typeof assistantName === 'number') {
                    assistant =
                        await ctx.chatluna_conversation.getAssistant(
                            assistantName
                        )
                } else {
                    assistant =
                        await ctx.chatluna_conversation.getAssistantByName(
                            assistantName as string
                        )
                }

                if (
                    assistant != null &&
                    !assistant.shared &&
                    assistant.ownerId !== bindId
                ) {
                    koa.body = JSON.stringify({
                        code: 400,
                        message: `Assistant not found ${assistantName}`
                    })
                    koa.status = 400
                    return
                }
            } catch (e) {
                ctx.logger.error(e)
                koa.body = JSON.stringify({
                    code: 400,
                    message: `Assistant not found ${assistantName}`
                })
                koa.status = 400
            }

            const body = {
                code: 0,
                data: assistant
            }

            koa.set('Content-Type', 'application/json')
            koa.body = JSON.stringify(body)
            koa.status = 200
        }
    )
}
