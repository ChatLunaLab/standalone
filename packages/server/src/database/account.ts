import { Context, Service } from 'cordis'
import type {} from 'minato'
import { ChatLunaAccount } from './types.ts'
import { randomUUID } from 'crypto'

export class ChatLunaServerDataBaseService extends Service {
    constructor(ctx: Context) {
        super(ctx, 'chatluna_server_database')
        this._defineDatabaseModel()
    }

    createAccount(account: ChatLunaAccount) {
        return this._database.create('chatluna_account', {
            ...account
        })
    }

    async getAccount(userId: string) {
        const quired = await this._database.get('chatluna_account', userId)

        if (quired.length > 1) {
            throw new Error(`Duplicate userId of ${userId}`)
        } else if (quired.length === 0) {
            return null
        } else {
            return quired[0]
        }
    }

    createApiKey(
        userId: string,
        key: string,
        balance: number = 1.0,
        expireTime: Date = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
        supportModels?: string[]
    ) {
        return this._database.create('chatluna_api_key', {
            userId,
            key,
            createdTime: new Date(),
            expireTime,
            balance,
            keyId: randomUUID(),
            supportModels
        })
    }

    async getApiKeys(userId: string) {
        const quired = await this._database.get('chatluna_api_key', {
            userId
        })

        return quired
    }

    async getApiKey(key: string) {
        const quired = await this._database.get('chatluna_api_key', {
            key
        })

        if (quired.length > 1) {
            throw new Error(`Duplicate key of ${key}`)
        } else if (quired.length === 0) {
            return null
        } else {
            return quired[0]
        }
    }

    async updateApiKey(userId: string, key: string, balance: number) {
        const apiKey = await this.getApiKey(key)

        if (apiKey === null) {
            throw new Error(`ApiKey of ${userId} not found`)
        }

        return this._database.upsert('chatluna_api_key', [
            {
                userId,
                key,
                balance
            }
        ])
    }

    async deleteApiKey(keyId: string, userId?: string) {
        const queryBuilder = {
            userId,
            keyId
        }

        if (userId === undefined) {
            delete queryBuilder.userId
        }

        return this._database.remove('chatluna_api_key', queryBuilder)
    }

    async deleteAccount(userId: string) {
        return this._database.remove('chatluna_account', userId)
    }

    async randomApiKey() {
        const characters =
            'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
        let apiKey = 'sk-' // OpenAI API keys typically start with 'sk-'
        for (let i = 0; i < 48; i++) {
            // OpenAI API keys are usually 52 characters long
            apiKey += characters.charAt(
                Math.floor(Math.random() * characters.length)
            )
        }
        return apiKey
    }

    private _defineDatabaseModel() {
        this._database.extend(
            'chatluna_account',
            {
                userId: {
                    type: 'string'
                },
                username: {
                    type: 'string'
                },
                password: {
                    type: 'string'
                },
                role: {
                    type: 'string'
                }
            },
            {
                primary: 'userId'
            }
        )

        this._database.extend(
            'chatluna_api_key',
            {
                userId: {
                    type: 'string'
                },
                key: {
                    type: 'string'
                },
                createdTime: {
                    type: 'date'
                },
                balance: {
                    type: 'double'
                },
                supportModels: {
                    type: 'list',
                    nullable: true
                },
                expireTime: {
                    type: 'date'
                },
                keyId: {
                    type: 'string'
                }
            },
            {
                primary: 'key'
            }
        )
    }

    private get _database() {
        return this.ctx.database
    }

    static inject = ['database', 'logger']
}

// wait minato update
declare module 'cordis' {
    interface Context {
        chatluna_server_database: ChatLunaServerDataBaseService
    }
}
