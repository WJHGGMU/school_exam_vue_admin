import { login, logout, getInfo } from '@/api/user'
import { getToken, setToken, removeToken, getRefreshToken, setRefreshToken, removeRefreshToken } from '@/utils/auth'
import { resetRouter } from '@/router'

const getDefaultState = () => {
  return {
    token: getToken(), // 存储access令牌
    refreshToken: getRefreshToken(), // 新增：存储refresh令牌
    name: '',
    avatar: ''
  }
}

const state = getDefaultState()

const mutations = {
  RESET_STATE: (state) => {
    Object.assign(state, getDefaultState())
  },
  SET_TOKEN: (state, token) => {
    state.token = token
  },
  // 新增：设置refresh令牌的mutation
  SET_REFRESH_TOKEN: (state, refreshToken) => {
    state.refreshToken = refreshToken
  },
  SET_NAME: (state, name) => {
    state.name = name
  },
  SET_AVATAR: (state, avatar) => {
    state.avatar = avatar
  }
}

const actions = {
  // user login
  login({ commit }, userInfo) {
    const { username, password } = userInfo
    return new Promise((resolve, reject) => {
      login({ username: username.trim(), password: password }).then(response => {
        commit('SET_TOKEN', response.access)
        setToken(response.access)
        commit('SET_REFRESH_TOKEN', response.refresh)
        setRefreshToken(response.refresh)
        resolve()
      }).catch(error => {
        console.log('错误详情：', error)
        reject(error)
      })
    })
  },

  // get user info
  getInfo({ commit, state }) {
    return new Promise((resolve, reject) => {
      // 使用access令牌获取用户信息
      getInfo(state.token).then(response => {

        if (!response) {
          return reject('Verification failed, please Login again.')
        }

        const { name, avatar } = response

        commit('SET_NAME', name)
        commit('SET_AVATAR', avatar)
        resolve(response)
      }).catch(error => {
        reject(error)
      })
    })
  },

  // user logout
  logout({ commit, state }) {
    return new Promise((resolve, reject) => {
      // 注意：这里可能需要根据后端要求传递refresh令牌或access令牌
      logout(state.refreshToken).then(() => {
        removeToken() // 移除access令牌
        removeRefreshToken() // 新增：移除refresh令牌
        resetRouter()
        commit('RESET_STATE')
        resolve()
      }).catch(error => {
        reject(error)
      })
    })
  },

  // remove token
  resetToken({ commit }) {
    return new Promise(resolve => {
      removeToken() // 移除access令牌
      removeRefreshToken() // 新增：移除refresh令牌
      commit('RESET_STATE')
      resolve()
    })
  }
}

export default {
  namespaced: true,
  state,
  mutations,
  actions
}
