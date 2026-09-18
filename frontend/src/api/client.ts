import axios from 'axios'

// 后端地址从 .env 读(VITE_API_BASE),开发时是 http://localhost:8000
export const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE,
})

// 后端错误统一是 {"error": {"code": "...", "message": "..."}}
// 这里拦截一下,把 message 提出来方便组件层显示
client.interceptors.response.use(
  (res) => res,
  (err) => {
    const message = err.response?.data?.error?.message ?? err.message
    return Promise.reject(new Error(message))
  },
)
