export type UserInfo = {
  id: string
  username: string
  name: string
  email?: string
  phone?: string
  accountType?: string
  status?: string
  phonePublic?: boolean
  emailPublic?: boolean
  account?: {
    accountType?: string
    status?: string
  }
}
