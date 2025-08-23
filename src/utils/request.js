import axios from 'axios'
import { MessageBox, Message } from 'element-ui'
import store from '@/store'
import { getToken } from '@/utils/auth'

const BASE_URL = 'http://125.124.131.223:28090';

// create an axios instance
const service = axios.create({
  baseURL: BASE_URL, // 直接使用后端地址
  timeout: 10000 // request timeout
})

// request interceptor
service.interceptors.request.use(
  config => {
    // 仅在有token时添加，登录接口可能还没有token，避免报错
    // if (store.getters.token) {
    //   config.headers['X-Token'] = getToken()
    // }
    return config
  },
  error => {
    console.log(error) // for debug
    return Promise.reject(error)
  }
)

// response interceptor
service.interceptors.response.use(
  /**
   * 修改：适配后端实际响应格式（无code字段）
   */
  response => {
    const res = response.data

    // 直接返回数据，不基于code判断（因为后端不返回code）
    return res
  },
  error => {
    console.log('err' + error) // for debug
    Message({
      message: error.message || '请求失败',
      type: 'error',
      duration: 10 * 1000
    })
    return Promise.reject(error)
  }
)

export default service
export { BASE_URL }
