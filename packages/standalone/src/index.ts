import { Context } from 'cordis'
import { apply as applyCore } from '@chatluna/core'
import { apply as applyMemory, inject as injectMemory } from '@chatluna/memory'
// import { apply as applyChat, inject as injectChat } from '@chatluna/chat'
import { Tool } from '@langchain/core/tools'
import { DefaultEnvironment } from '@chatluna/agent/environment'
import {
    apply as applyService,
    inject as injectService
} from '@chatluna/service'
import type {} from '@cordisjs/plugin-http'
import type {} from '@cordisjs/plugin-proxy-agent'
import { BufferWindowMemory } from '@chatluna/core/memory'
import { ChatLunaChatModel } from '@chatluna/core/model'
import { AgentSystem, DynamicToolCallAgent } from '@chatluna/agent'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { HumanMessage } from '@langchain/core/messages'
import { InMemoryChatMessageHistory } from '@langchain/core/chat_history'

/**
 *
 * load chatluna root service
 *
 * @param ctx parentContext
 */
export function apply(ctx: Context) {
    applyCore(ctx)

    ctx.inject(injectMemory, (ctx) => {
        applyMemory(ctx)
    })

    ctx.inject(injectService, (ctx) => {
        applyService(ctx)

        ctx.inject(['chatluna'], (ctx) => {
            ctx.on('ready', async () => {
                await new Promise((resolve) => setTimeout(resolve, 1000))

                const chatMemory = new BufferWindowMemory({
                    chatHistory: new InMemoryChatMessageHistory()
                })

                const model = await ctx.chatluna
                    .createModel('openai/gpt-4o')
                    .then((model) => model as ChatLunaChatModel)

                const env = new DefaultEnvironment(chatMemory, model)

                const agent = new DynamicToolCallAgent(
                    'chatgpt',
                    'chatgpt agent',
                    env,
                    ChatPromptTemplate.fromMessages([
                        ['system', 'You are a helpful assistant.']
                    ]),
                    ['joke']
                )

                env.addTool(new JokeTool(ctx))

                const agentSystem = new AgentSystem(ctx, env)

                agentSystem.addAgent(agent)

                agentSystem.registerDefaultNodes()

                const result = await agentSystem.invoke(
                    'chatgpt',
                    new HumanMessage('tell me a joke using the joke tool')
                )

                console.log(result)
            })
        })
    })
}

class JokeTool extends Tool {
    name = 'joke'
    description = 'tell a joke'

    constructor(private ctx: Context) {
        super()
    }

    async _call(input: string): Promise<string> {
        // fetch joke from external api
        const joke = await this.ctx.http.get(
            'https://official-joke-api.appspot.com/jokes/random',
            {
                proxyAgent: 'http://127.0.0.1:7890'
            }
        )
        return JSON.stringify(joke)
    }
}
