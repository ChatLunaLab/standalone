import { Context, Service } from 'cordis'
import type {} from 'minato'
import { ChatLunaAccount } from './types.ts'

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

    createApiKey(userId: string, key: string, balance: number = 1.0) {
        return this._database.create('chatluna_api_key', {
            userId,
            key,
            createdTime: new Date(),
            balance
        })
    }

    async getApiKey(userId: string) {
        const quired = await this._database.get('chatluna_api_key', userId)

        if (quired.length > 1) {
            throw new Error(`Duplicate userId of ${userId}`)
        } else if (quired.length === 0) {
            return null
        } else {
            return quired[0]
        }
    }

    async updateApiKey(userId: string, balance: number) {
        const apiKey = await this.getApiKey(userId)

        if (apiKey === null) {
            throw new Error(`ApiKey of ${userId} not found`)
        }

        return this._database.upsert('chatluna_api_key', [
            {
                userId,
                balance
            }
        ])
    }

    async deleteApiKey(userId: string) {
        return this._database.remove('chatluna_api_key', userId)
    }

    async deleteAccount(userId: string) {
        return this._database.remove('chatluna_account', userId)
    }

    async randomApiKey() {
        // sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
        const buffer = ['sk']

        while (true) {
            for (let i = 0; i < 32; i++) {
                buffer.push(
                    Math.floor(Math.random() * 16)
                        .toString(16)
                        .toUpperCase()
                )
            }

            const key = buffer.join('-')

            const quired = await this._database.get('chatluna_api_key', { key })

            if (quired.length === 0) {
                return key
            }

            buffer.length = 2
        }
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
                }
            },
            {
                primary: 'userId'
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
