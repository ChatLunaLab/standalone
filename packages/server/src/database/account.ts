import { Context, Service } from 'cordis'
import type {} from 'minato'

export class ChatLunaServerDataBaseService extends Service {
    constructor(ctx: Context) {
        super(ctx, 'chatluna_server_database')
        this._defineDatabaseModel()
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
