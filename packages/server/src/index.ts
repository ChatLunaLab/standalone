import { Context, Schema } from 'cordis'
import { inject as injectMemory } from '@chatluna/memory'
import { inject as injectChat } from '@chatluna/chat'
import { inject as injectService } from '@chatluna/service'
import {} from '@cordisjs/plugin-server'
import { ChatLunaServerDataBaseService } from '@chatluna/server/database'
import { apply as applyRegister } from './routers/register.ts'
import { apply as applyAdmin } from './routers/admin.ts'
import { apply as applyLogin } from './routers/login.ts'
import { apply as applyApiKeys } from './routers/api_key.ts'
import { apply as applyModel } from './routers/model.ts'
import { apply as applyConversation } from './routers/conversation.ts'
import { apply as applyAssistant } from './routers/assistant.ts'

/**
 *
 * load chatluna server
 *
 * @param ctx parentContext
 */
export function apply(ctx: Context, config: Config) {
    ctx.plugin(ChatLunaServerDataBaseService)
    ctx.inject(['chatluna_server_database'], async (ctx) => {
        applyAdmin(ctx, config)
        applyRegister(ctx, config)
        applyLogin(ctx, config)
        applyApiKeys(ctx, config)
        applyModel(ctx, config)
        applyConversation(ctx, config)
        applyAssistant(ctx, config)

        ctx.logger.success(
            'server listening at %c',
            `${ctx.server.selfUrl}${config.path}`
        )
    })
}

// array distinct
export const inject = [
    ...injectMemory,
    ...injectChat,
    ...injectService,
    'server',
    'chatluna_user',
    'chatluna_assistant',
    'chatluna_conversation'
].filter((item, index, self) => self.indexOf(item, 0) === index)

export interface Config {
    path: string
    rootUser: string
    rootPassword: string
}

export const Config: Schema<Config> = Schema.object({
    path: Schema.string()
        .description('ChatLuna API 后端的监听地址。')
        .default('/chatluna'),
    rootUser: Schema.string()
        .description('ChatLuna API 后端的超级管理员用户名。')
        .default('admin'),
    rootPassword: Schema.string()
        .description('ChatLuna API 后端的超级管理员密码。')
        .default('admin')
})

export const name = '@chatluna/server'
