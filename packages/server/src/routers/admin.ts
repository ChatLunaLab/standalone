import { Context } from 'cordis'
import { Config } from '../index.ts'
import { createHash } from 'crypto'

export function apply(ctx: Context, config: Config) {
    ctx.database.upsert('chatluna_account', [
        {
            username: config.rootUser,
            // sha1(password)
            password: sha1(config.rootPassword),
            role: 'admin',
            userId: 'admin'
        }
    ])
}

function sha1(text: string) {
    return createHash('sha1').update(text).digest('hex')
}
