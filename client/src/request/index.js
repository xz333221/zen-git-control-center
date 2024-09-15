// request/index.js

// 定义基础的请求方法
const request = {
  // GET 请求
  get: async (url, params = {}, options = {}) => {
    // 构造查询字符串
    const queryString = new URLSearchParams(params).toString();
    const fullUrl = queryString ? `${url}?${queryString}` : url;

    try {
      const response = await fetch(fullUrl, {
        method: 'GET',
        ...options
      });
      // 检查响应状态
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('GET request failed:', error);
      throw error;
    }
  },

  // POST 请求
  post: async (url, params = {}, options = {}) => {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {}) // 合并用户传入的 headers
        },
        body: JSON.stringify(params), // 将参数转换为 JSON 字符串
        ...options // 其他自定义配置
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('POST request failed:', error);
      throw error;
    }
  }
};

export default request;
