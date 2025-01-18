// use for web-ui
export interface ChatLunaAccount {
    username: string
    // TODO: md5
    password: string
    // email
    userId: string
    // bind to chatluna user id
    bindId: string
    role: 'admin' | 'user'
    avatar?: string
}

export interface ChatLunaApiKey {
    key: string
    keyId: string
    userId: string
    createdTime: Date
    expireTime: Date
    balance: number
    supportModels?: string[]
}

declare module 'cordis' {
    interface Tables {
        chatluna_account: ChatLunaAccount

        chatluna_api_key: ChatLunaApiKey
    }
}
