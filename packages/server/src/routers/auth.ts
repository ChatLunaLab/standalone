import { Context } from 'cordis'
import { Config } from '../index.ts'
import { generateKeyPairSync, privateDecrypt } from 'crypto'
import jwt from 'jsonwebtoken'
import { sha1 } from '@chatluna/utils'
import { ChatLunaAccount } from '../database/types.ts'
import assert from 'assert'

export function apply(ctx: Context, config: Config) {
    let tempRSAKeyPool: Record<string, string> = {}

    ctx.timer.setInterval(
        () => {
            tempRSAKeyPool = {}
        },
        1000 * 60 * 3
    )

    ctx.server.post(
        `${config.path}/register`,
        async (koa) => {
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

            if (!tempRSAKeyPool[publicKey]) {
                koa.status = 401
                koa.body = JSON.stringify({
                    code: 401,
                    message: 'invalid public key'
                })
            }
        },
        async (koa) => {
            let { email, username, password, publicKey } = koa.request.body as {
                email: string
                username: string
                password: string
                publicKey: string
            }

            const privateKey = tempRSAKeyPool[publicKey]

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
                    message:
                        'invalid password, please use rsa to encrypt password'
                })
                ctx.logger.error(e)
                return
            }

            try {
                await ctx.chatluna_server_database.createAccount({
                    userId: email,
                    password,
                    role: 'user',
                    username,
                    bindId: email
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

            const accessToken = jwt.sign(
                {
                    userId: email,
                    bindId: email,
                    timestamp: Date.now()
                },
                sha1(config.rootPassword),
                {
                    expiresIn: '30m'
                }
            )

            const refreshToken = jwt.sign(
                {
                    userId: email,
                    bindId: email,
                    refresh: true,
                    password: sha1(password),
                    timestamp: Date.now() - 10
                },
                sha1(config.rootPassword),
                {
                    expiresIn: '30d'
                }
            )

            koa.body = JSON.stringify({
                code: 0,
                data: {
                    accessToken,
                    refreshToken
                }
            })
        }
    )

    ctx.server.get(`${config.path}/v1/generate-register-key`, async (koa) => {
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

    ctx.server.post(`${config.path}/v1/login`, async (koa) => {
        const { email, password } = koa.request.body
        koa.set('Content-Type', 'application/json')

        let account: ChatLunaAccount
        try {
            account = await ctx.chatluna_server_database.getAccount(email)
            assert(account != null)
        } catch (e) {
            koa.status = 400
            koa.body = JSON.stringify({
                code: 400,
                message: `user not found for ${email}`
            })
            return
        }

        if (account.password !== password) {
            koa.status = 400
            koa.body = JSON.stringify({
                code: 400,
                message: 'password error'
            })
            return
        }

        koa.status = 200

        // jsonwebtoken

        const accessToken = jwt.sign(
            {
                userId: account.userId,
                bindId: account.bindId,
                timestamp: Date.now()
            },
            sha1(config.rootPassword),
            {
                expiresIn: '30m'
            }
        )

        const refreshToken = jwt.sign(
            {
                userId: account.userId,
                bindId: account.bindId,
                password: sha1(account.password),
                timestamp: Date.now() - 10,
                refresh: true
            },
            sha1(config.rootPassword),
            {
                expiresIn: '30d'
            }
        )

        koa.body = JSON.stringify({
            code: 0,
            data: {
                accessToken,
                refreshToken
            }
        })
    })

    ctx.server.get(`${config.path}/v1/refresh-token`, async (koa) => {
        let refreshToken = koa.request.headers['X-refresh-token']
        if (refreshToken == null || refreshToken instanceof Array) {
            koa.status = 400
            koa.body = JSON.stringify({
                code: 400,
                message: 'refresh_token not found'
            })
            return
        }

        try {
            const payload = jwt.verify(
                refreshToken,
                sha1(config.rootPassword)
            ) as {
                userId: string
                bindId: string
                timestamp: number
                refresh: boolean
                password: string
            }
            if (payload.refresh !== null) {
                koa.status = 401
                koa.body = JSON.stringify({
                    code: 401,
                    message: 'refresh_token is not refresh token'
                })
                return
            }

            try {
                const account = await ctx.chatluna_server_database.getAccount(
                    payload.userId
                )

                if (sha1(account.password) !== payload.password) {
                    koa.status = 401
                    koa.body = JSON.stringify({
                        code: 401,
                        message: 'password is changed'
                    })
                    return
                }
            } catch (e) {
                koa.status = 401
                koa.body = JSON.stringify({
                    code: 401,
                    message: 'user not found'
                })
                return
            }

            const accessToken = jwt.sign(
                {
                    userId: payload.userId,
                    bindId: payload.bindId,
                    timestamp: Date.now()
                },
                sha1(config.rootPassword),
                {
                    expiresIn: '30m'
                }
            )

            refreshToken = jwt.sign(
                {
                    userId: payload.userId,
                    bindId: payload.bindId,
                    timestamp: Date.now() - 10,
                    password: payload.password,
                    refresh: true
                },
                sha1(config.rootPassword),
                {
                    expiresIn: '30d'
                }
            )

            koa.status = 200

            koa.body = JSON.stringify({
                code: 0,
                data: {
                    accessToken,
                    refreshToken
                }
            })
        } catch (e) {
            koa.status = 401
            koa.body = JSON.stringify({
                code: 401,
                message: 'refresh_token is invalid'
            })
        }
    })

    function generateKeys() {
        const length = Object.keys(tempRSAKeyPool).length

        if (length > 100) {
            throw new Error('too many keys')
        }

        const { publicKey, privateKey } = generateRSAKeys()

        tempRSAKeyPool[publicKey] = privateKey

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
