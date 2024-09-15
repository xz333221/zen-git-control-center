const { Controller } = require('egg');
const { exec } = require('child_process');

class RunController extends Controller {
  async cmd() {
    const { ctx } = this;
    const { cmd, path } = ctx.request.body;

    // 验证是否有命令传入
    if (!cmd) {
      ctx.body = {
        code: 1,
        msg: 'Command is required',
      };
      return;
    }

    // 执行命令
    try {
      const result = await this.runCommand(cmd, path);
      ctx.body = {
        code: 0,
        data: result,
        msg: 'Command executed successfully',
      };
    } catch (error) {
      ctx.body = {
        code: 1,
        data: error.message,
        msg: 'Command execution failed',
      };
    }
  }

  // 通过 Promise 包装 exec，方便使用 async/await
  runCommand(cmd, path = '.', options = {}) {
    return new Promise((resolve, reject) => {
      // 设置默认的执行路径和资源限制
      const execOptions = {
        cwd: path,           // 设置命令执行路径
        maxBuffer: options.maxBuffer || 1024 * 1024, // 设置最大输出缓冲区，默认 1MB
        ...options           // 允许传入其他选项
      };

      exec(cmd, execOptions, (error, stdout, stderr) => {
        if (error) {
          reject(error);
        } else if (stderr) {
          reject(new Error(stderr));
        } else {
          resolve(stdout);
        }
      });
    });
  }
}

module.exports = RunController;
