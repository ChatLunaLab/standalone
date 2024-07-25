import { Context } from 'cordis'
import { inject as injectMemory } from '@chatluna/memory'
import { inject as injectChat } from '@chatluna/chat'
import {} from '@chatluna/service/service'
import { inject as injectService } from '@chatluna/service'
import {} from '@cordisjs/plugin-server'
import { ChatLunaServerDataBaseService } from '@chatluna/server/database'

/**
 *
 * load chatluna server
 *
 * @param ctx parentContext
 */
export function apply(ctx: Context) {
    ctx.plugin(ChatLunaServerDataBaseService)
    ctx.inject(['chatluna_server_database'], async (ctx) => {
        // TODO: server here
    })
}

// array distinct
export const inject = [
    ...injectMemory,
    ...injectChat,
    ...injectService,
    'server'
].filter((item, index, self) => self.indexOf(item, 0) === index)
