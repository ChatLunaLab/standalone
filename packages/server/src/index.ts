import { Context } from 'cordis'
import { inject as injectMemory } from '@chatluna/memory'
import { inject as injectChat } from '@chatluna/chat'
import {} from '@chatluna/service/service'
import { inject as injectService } from '@chatluna/service'
import {} from '@cordisjs/plugin-server'

/**
 *
 * load chatluna server
 *
 * @param ctx parentContext
 */
export function apply(ctx: Context) {
    ctx.server.get('/chatluna/model/list', async (koa, next) => {
        koa.type = 'application/json'
        koa.status = 200
        koa.body = JSON.stringify({ hello: 'world' })
    })
}

// array distinct
export const inject = [
    ...injectMemory,
    ...injectChat,
    ...injectService,
    'server'
].filter((item, index, self) => self.indexOf(item, 0) === index)
