import { Context } from 'cordis'
import { apply as applyCore } from '@chatluna/core'
import { apply as applyMemory, inject as injectMemory } from '@chatluna/memory'
import { apply as applyChat, inject as injectChat } from '@chatluna/chat'
import {} from '@chatluna/service/service'
import {
    apply as applyService,
    inject as injectService
} from '@chatluna/service'

/**
 *
 * load chatluna root service
 *
 * @param ctx parentContext
 */
export function apply(ctx: Context) {
    applyCore(ctx)

    ctx.inject(injectChat, (ctx) => {
        applyChat(ctx)
    })

    ctx.inject(injectMemory, (ctx) => {
        applyMemory(ctx)
    })

    ctx.inject(injectService, (ctx) => {
        applyService(ctx)
    })
}
