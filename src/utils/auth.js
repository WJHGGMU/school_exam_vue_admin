import Cookies from 'js-cookie'

// accessToken 相关配置
const TokenKey = 'access'
// 新增：refreshToken 存储键名
const RefreshTokenKey = 'refresh'

// accessToken 操作
export function getToken() {
  return Cookies.get(TokenKey)
}

export function setToken(token) {
  return Cookies.set(TokenKey, token)
}

export function removeToken() {
  return Cookies.remove(TokenKey)
}

// 新增：refreshToken 操作
export function getRefreshToken() {
  return Cookies.get(RefreshTokenKey)
}

export function setRefreshToken(refreshToken) {
  return Cookies.set(RefreshTokenKey, refreshToken)
}

export function removeRefreshToken() {
  return Cookies.remove(RefreshTokenKey)
}
