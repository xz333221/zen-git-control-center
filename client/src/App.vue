<template>
  <el-container>
    <!-- 项目操作部分 -->
    <el-header>
      <el-select v-model="selectedProject" placeholder="选择项目地址" style="width: 300px;">
        <el-option v-for="project in projects" :key="project.name" :label="project.name"
                   :value="project.name"></el-option>
      </el-select>
      <el-button type="primary" @click="showDialog = true">设置</el-button>
      <el-button type="primary" @click="runGitCmd('git config user.name')">git config user.name</el-button>
      <el-button type="primary" @click="runGitCmd('git status')">获取项目状态</el-button>
      <el-button type="primary" @click="runGitCmd('git branch')">获取项目分支</el-button>
      <el-button type="primary" @click="runGitCmd('git branch --all')">获取所有项目分支</el-button>
      <el-button type="primary" @click="runGitCmd('git pull')">拉取</el-button>
      <el-button type="primary" @click="runGitCmd('git log')">git log</el-button>
      <el-button type="primary" @click="runGitCmd('git log --graph --oneline --decorate --all')">图形化log</el-button>
      <el-button type="primary" @click='getMyTodayCode'>我今天提交的代码</el-button>

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
        <pre>{{ result }}</pre>
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

const result = ref('');
const commitContent = ref('');
const userName = ref('');
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
async function runGitCmd(cmd) {
  if (!selectedProject.value) return;
  // 这里调用后端 API 获取项目状态
  const res = await $http.post('/api/run/cmd', {cmd, path: selectedProject.value})
  result.value = res.data;
  return res.data;
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
  const command = `git log --author="${userName.value}" --since=midnight --pretty=format:"%h - %ad [%D] - %s" --date=format:"%Y-%m-%d %H:%M"`;
  await runGitCmd(command);
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
