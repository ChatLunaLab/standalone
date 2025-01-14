import { Context } from 'cordis'
import { Config } from '../index.ts'
import { generateKeyPairSync, privateDecrypt } from 'crypto'

export function apply(ctx: Context, config: Config) {
    let tempRC4KeyPool: Record<string, string> = {}

    ctx.timer.setInterval(
        () => {
            tempRC4KeyPool = {}
        },
        1000 * 60 * 3
    )

    ctx.server.use(async (koa, next) => {
        if (koa.path !== `${config.path}/register`) {
            await next()
            return
        }

        koa.set('Content-Type', 'application/json')
        const { publicKey } = koa.request.body as {
            publicKey?: string
        }

        if (!publicKey) {
            koa.status = 400
            koa.body = JSON.stringify({
                code: 400,
                message: 'missing public key'
            })
            return
        }

        if (!tempRC4KeyPool[publicKey]) {
            koa.status = 401
            koa.body = JSON.stringify({
                code: 401,
                message: 'invalid public key'
            })
            return
        }

        await next()
    })
    ctx.server.post(`${config.path}/register`, async (koa) => {
        let { email, username, password, publicKey } = koa.request.body as {
            email: string
            username: string
            password: string
            publicKey: string
        }

        const privateKey = tempRC4KeyPool[publicKey]

        try {
            // rsa decrypt
            password = privateDecrypt(
                Buffer.from(privateKey, 'base64'),
                Buffer.from(password, 'base64')
            ).toString('utf-8')
        } catch (e) {
            // the password isn't use rsa
            koa.status = 400
            koa.body = JSON.stringify({
                code: 400,
                message: 'invalid password, please use rsa'
            })
            ctx.logger.error(e)
            return
        }

        try {
            await ctx.chatluna_server_database.createAccount({
                userId: email,
                password,
                role: 'user',
                username
            })
        } catch (e) {
            // database error
            koa.status = 500
            koa.body = JSON.stringify({
                code: 500,
                message: 'internal error of database'
            })
            ctx.logger.error(e)
            return
        }

        koa.status = 200
        koa.body = JSON.stringify({
            code: 0,
            message: 'success'
        })
    })

    ctx.server.get(`${config.path}/generate-register-key`, async (koa) => {
        try {
            const { publicKey } = generateKeys()

            koa.set('Content-Type', 'text/plain')
            koa.status = 200
            koa.body = publicKey
        } catch (e) {
            koa.status = 500
            koa.body = JSON.stringify({
                code: 500,
                message: 'internal error of generate key'
            })
            ctx.logger.error(e)
        }
    })

    function generateKeys() {
        const length = Object.keys(tempRC4KeyPool).length

        if (length > 100) {
            throw new Error('too many keys')
        }

        const { publicKey, privateKey } = generateRSAKeys()

        tempRC4KeyPool[publicKey] = privateKey

        return {
            publicKey,
            privateKey
        }
    }
}

function generateRSAKeys() {
    return generateKeyPairSync('rsa', {
        modulusLength: 4096,
        publicKeyEncoding: {
            type: 'spki',
            format: 'pem'
        },
        privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem',
            cipher: 'aes-256-cbc',
            passphrase: 'top secret'
        }
    })
}
