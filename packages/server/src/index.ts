import { Context, Schema } from 'cordis'
import { inject as injectMemory } from '@chatluna/memory'
import { inject as injectChat } from '@chatluna/chat'
import {} from '@chatluna/service/service'
import { inject as injectService } from '@chatluna/service'
import {} from '@cordisjs/plugin-server'
import { ChatLunaServerDataBaseService } from '@chatluna/server/database'
import { apply as applyRegister } from './routers/register.ts'

/**
 *
 * load chatluna server
 *
 * @param ctx parentContext
 */
export function apply(ctx: Context, config: Config) {
    ctx.plugin(ChatLunaServerDataBaseService)
    ctx.inject(['chatluna_server_database'], async (ctx) => {
        applyRegister(ctx, config)
    })
}

// array distinct
export const inject = [
    ...injectMemory,
    ...injectChat,
    ...injectService,
    'server'
].filter((item, index, self) => self.indexOf(item, 0) === index)

export interface Config {
    path: string
}

export const Config: Schema<Config> = Schema.object({
    path: Schema.string()
        .description('ChatLuna API 后端的监听地址。')
        .default('/chatluna')
})
