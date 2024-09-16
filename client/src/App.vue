<template>
  <el-container>
    <!-- 项目操作部分 -->
    <el-header>
      <el-select v-model="selectedProject" placeholder="选择项目地址" style="width: 300px;">
        <el-option v-for="project in projects" :key="project.name" :label="project.name"
                   :value="project.name"></el-option>
      </el-select>
      <el-button type="primary" @click="showDialog = true">设置</el-button>
      <!--      <el-button type="primary" @click="runGitCmd('git config user.name')">git config user.name</el-button>-->
      <el-button type="primary" @click="runGitCmd('git status')">获取项目状态</el-button>
      <el-button type="primary" @click="runGitCmd('git branch')">获取项目分支</el-button>
      <el-button type="primary" @click="runGitCmd('git branch --all')">获取所有项目分支</el-button>
      <el-button type="primary" @click="runGitCmd('git pull')">拉取</el-button>
      <el-button type="primary" @click="runGitCmd('git log')">git log</el-button>
      <el-button type="primary" @click="runGitCmd('git log --graph --oneline --decorate --all')">图形化log</el-button>
      <el-button type="primary" @click='getMyTodayCode'>我今天提交的代码</el-button>
      <el-switch v-model="openPullTimer" active-color="#13ce66" inline-prompt @change="pullWithTimer"
                 active-text="定时拉取代码" inactive-text="定时拉取代码"></el-switch>
      <el-switch v-model="openViewSubmitTimer" active-color="#13ce66" inline-prompt @change="viewSubmitWithTimer"
                 active-text="定时查看我的提交" inactive-text="定时查看我的提交"></el-switch>

      <!--      <el-button type="primary" @click="runGitCmd('git status')">提交</el-button>-->
    </el-header>
    <!-- 项目状态部分 -->
    <el-main>
      <div class="options">
        <el-input v-model="commitContent" type="textarea" placeholder="输入提交信息"
                  @keyup.enter="runGitCmd('git commit -m ' + commitContent)"/>

        <el-button type="success" @click="addAndCommitAndPush">提交所有</el-button>
        <el-button type="primary" @click="runGitCmd('git add .')">add所有</el-button>
        <el-button type="primary" @click="commit">提交</el-button>
        <el-button type="primary" @click="runGitCmd('git push')">push</el-button>
      </div>
      <div class="content">
        <div v-for="item in result" :key="item">
          {{ item }}
        </div>
        <div class="gitLogWrap">
          <!--          <div v-for="item in gitLog" :key="item">-->
          <!--            {{ item }}-->
          <!--            <el-button type="primary" @click="copyHash(item)">复制hash</el-button>-->
          <!--          </div>-->
          <el-table :data="gitLog" style="width: 100%;">
            <el-table-column v-for="item in tableColumn" :prop="item.prop" :label="item.label"/>
            <el-table-column label="操作">
              <template #default="{ row }">
                <el-button type="primary" @click="copyHash(row.hash)">复制hash</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
    </el-main>

    <!-- 弹窗 -->
    <el-dialog v-model="showDialog" title="设置项目路径">
      <el-input v-model="newProject" placeholder="输入项目地址" @keyup.enter="addProject" style="margin-bottom: 20px;"/>
      <!--      <el-button type="primary" @click="readDirectory">选取目录</el-button>-->
      <el-button type="primary" @click="addProject">添加项目</el-button>

      <el-table :data="projects" style="width: 100%; margin-top: 20px;">
        <el-table-column prop="name" label="项目地址"/>
        <el-table-column label="操作">
          <template #default="{ row }">
            <el-button @click="removeProject(row.name)" type="danger">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </el-container>
</template>

<script setup>
import {ref, onMounted} from 'vue';
import {openDB} from 'idb';
import {ElMessage} from 'element-plus';
import $http from './request/index.js';

const dbName = 'projectsDB';
const storeName = 'projectsStore';

const result = ref([]);
const gitLog = ref([]);
const commitContent = ref('');
const userName = ref('');
const tableColumn = ref([]);
const openPullTimer = ref(false);
const pullTimer = ref(null);
const openViewSubmitTimer = ref(false);
const viewSubmitTimer = ref(null);
let db;

async function readDirectory() {
  try {
    // 请求用户选择目录
    const directoryHandle = await window.showDirectoryPicker();

    // 获取所选目录的名称
    const directoryName = directoryHandle.name;
    console.log(`Selected directory: ${directoryName}`);
    return

    // 遍历目录
    for await (const entry of directoryHandle.values()) {
      if (entry.kind === 'file') {
        console.log(`File: ${entry.name}`);

        // 如果需要读取文件内容，可以使用 entry.getFile()
        // const file = await entry.getFile();
        // console.log(`File content: ${await file.text()}`);

      } else if (entry.kind === 'directory') {
        console.log(`Directory: ${entry.name}`);
        // 可以递归处理子目录
      }
    }
  } catch (err) {
    console.error('Error reading directory:', err);
  }
}

async function initDB() {
  db = await openDB(dbName, 1, {
    upgrade(db) {
      db.createObjectStore(storeName, {keyPath: 'name'});
    },
  });
}

async function getAllProjects() {
  return (await db.transaction(storeName).objectStore(storeName).getAll()) || [];
}

async function addProjectToDB(project) {
  const tx = db.transaction(storeName, 'readwrite');
  await tx.objectStore(storeName).put(project);
  await tx.done;
}

async function removeProjectFromDB(name) {
  const tx = db.transaction(storeName, 'readwrite');
  await tx.objectStore(storeName).delete(name);
  await tx.done;
}

// 组件状态
const projects = ref([]);
const selectedProject = ref(null);
const newProject = ref('');
const showDialog = ref(false);

// 加载项目列表
onMounted(async () => {
  await initDB();
  projects.value = await getAllProjects();
  await getGitUserName();

});
const getGitUserName = async () => {
  const res = await runCmd('git config user.name')
  userName.value = res.trim();
}

// 添加项目
async function addProject() {
  if (!newProject.value) return;
  await addProjectToDB({name: newProject.value});
  projects.value = await getAllProjects();
  newProject.value = '';
  ElMessage.success('项目地址添加成功');
}

// 删除项目
async function removeProject(name) {
  await removeProjectFromDB(name);
  projects.value = await getAllProjects();
  ElMessage.success('项目地址删除成功');
}

// 操作项目
async function runGitCmd(cmd, type) {
  if (!selectedProject.value) return;
  // 这里调用后端 API 获取项目状态
  const res = await $http.post('/api/run/cmd', {cmd, path: selectedProject.value})
  const resultValue = res.data.split('\n');
  switch (type) {
    case 'gitLog':
      gitLog.value = resultValue;
      break;
    default:
      result.value = resultValue;
  }
  return resultValue;
  // ElMessage.success(`操作成功`);
}

async function runCmd(cmd) {
  const res = await $http.post('/api/run/cmd', {cmd, path: selectedProject.value})
  return res.data;
}

async function commit() {
  if (!commitContent.value) {
    commitContent.value = 'commit';
  }
  await runGitCmd(`git commit -m "${commitContent.value}"`);
}

async function addAndCommitAndPush() {
  if (!selectedProject.value) return;
  await runGitCmd('git add .');
  await commit();
  await runGitCmd('git push');
}

async function getMyTodayCode() {
  const formatList = {
    "%H": "提交的完整哈希值",
    "%h": "提交的简短哈希值",
    "%T": "树对象的完整哈希值",
    "%t": "树对象的简短哈希值",
    "%P": "父提交的完整哈希值",
    "%p": "父提交的简短哈希值",
    "%an": "作者名字",
    "%ae": "作者电子邮件",
    "%cn": "提交者名字",
    "%ce": "提交者电子邮件",
    "%d": "引用（如标签、分支名）信息",
    "%D": "类似于 %d，包括分支和标签的详细信息。",
    "%f": "提交信息的缩略版本，用于 URL",
    "%s": "提交信息（主题行）",
    "%b": "提交信息的主体部分",
    "%N": "没有换行的提交信息（没有空行的内容）",
    "%ai": "作者时间（ISO 8601 格式）",
    "%aI": "作者时间（ISO 8601 格式，无时区）",
    "%aD": "作者时间（RFC 2822 格式）",
    "%ad": "作者时间（RFC 2822 格式）该占位符会根据 --date 选项的设置格式化时间",
    "%ci": "提交时间（ISO 8601 格式）",
    "%cI": "提交时间（ISO 8601 格式，无时区）",
    "%cD": "提交时间（RFC 2822 格式）",
    "%cr": "提交时间（相对时间，如“2 weeks ago”）",
    "%e": "邮件地址（作者和提交者的地址）"
  };
  const formatListData = [
    {
      label: '哈希',
      symbol: '%h',
      prop: 'hash',
    },
    {
      label: '时间',
      symbol: '%ad',
      prop: 'date',
    },
    {
      label: '分支',
      symbol: '%D',
      prop: 'branch',
    },
    {
      label: '信息',
      symbol: '%s',
      prop: 'message',
    },
    {
      label: '作者',
      symbol: '%an',
      prop: 'author',
    },
    {
      label: '提交者',
      symbol: '%cn',
      prop: 'committer',
    },
    {
      label: '邮箱',
      symbol: '%e',
      prop: 'email',
    },
  ]
  let column = ['哈希', '作者', '时间', '分支', '信息'];
  // let columnData = formatListData.filter(item => column.includes(item.label))
  let columnData = column.map(item => {
    return formatListData.find(i => i.label === item)
  })
  tableColumn.value = columnData
  let keyList = columnData.map(item => item.symbol);
  let symbol = '--|--';
  let formatString = keyList.join(symbol);
  console.log(`formatString ==> `, formatString)

  const command = `git log --author="${userName.value}" --since=midnight --pretty=format:"${formatString}" --date=format:"%Y-%m-%d %H:%M"`;
  const res = await runCmd(command, 'gitLog');
  console.log(`res ==> `, res)
  let resList = res.split('\n');
  let tableList = resList.map(item => {
    let list = item.split('--|--');
    let obj = {};
    columnData.map((i, index) => {
      obj[i.prop] = list[index];
    });
    return obj;
  })
  console.log(`tableList ==> `, tableList)
  gitLog.value = tableList;
}

async function copyHash(item) {
  await navigator.clipboard.writeText(item);
}

async function pullWithTimer(value) {
  if (value) {
    await runGitCmd('git pull');
    pullTimer.value = setInterval(async () => {
      await runGitCmd('git pull');
      // }, 5 * 1000);
    }, 10 * 60 * 1000);
  } else {
    clearInterval(pullTimer.value);
  }
}

async function viewSubmitWithTimer(value) {
  if (value) {
    await getMyTodayCode();
    viewSubmitTimer.value = setInterval(async () => {
      await getMyTodayCode();
    }, 10 * 60 * 1000);
  } else {
    clearInterval(viewSubmitTimer.value);
  }
}

</script>

<style scoped>
.el-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.el-main {
  margin-top: 20px;
}
</style>
