# vue3-office

基于 [vue-office](https://501351981.github.io/vue-office/examples/docs/guide/) 修改满足自身项目需求。

目前只修改了excel模块。

- 删除了非vue框架的js功能
- 删除原项目excel中 `x-data-spreadsheet`源码，通过npm 包的方式引入
- excel暴露 reRender函数供窗口大小改变时调用（具体使用参考excel示例）
- 修改项目使用`pnpm`安装

## 安装

```shell
cd core
pnpm install
```

## 使用示例

文档预览场景大致可以分为三种：
- 有文档CDN地址，比如 https://***.docx，将文档地址字符串传给组件的src属性
- 通过接口请求获取文件内容，此时可以获取文件的ArrayBuffer或Blob格式数据传给组件的src属性
- 文件上传时预览，此时可以获取文件的ArrayBuffer或Blob格式数据传给组件的src属性

<details>
<summary>docx文件预览示例 （三种使用方式均有示例）</summary>

**1. 使用网络地址预览**
```vue
<template>
    <vue-office-docx
        :src="docx"
        style="height: 100vh;"
        @rendered="rendered"
    />
</template>

<script>
//引入VueOfficeDocx组件
import VueOfficeDocx from '@vue3-office/docx'
//引入相关样式
import '@vue3-office/docx/lib/index.css'

export default {
    components:{
        VueOfficeDocx
    },
    data(){
        return {
            docx: 'http://static.shanhuxueyuan.com/test6.docx' //设置文档网络地址，可以是相对地址
        }
    },
    methods:{
        rendered(){
            console.log("渲染完成")
        }
    }
}
</script>
```

**2. 上传文件预览**

读取文件的ArrayBuffer
```vue
<template>
    <div>
        <input type="file" @change="changeHandle"/>
        <vue-office-docx :src="src"/>
    </div>
</template>

<script>
import VueOfficeDocx from '@vue3-office/docx'
import '@vue3-office/docx/lib/index.css'

export default {
    components: {
        VueOfficeDocx
    },
    data(){
        return {
            src: ''
        }
    },
    methods:{
        changeHandle(event){
            let file = event.target.files[0]
            let fileReader = new FileReader()
            fileReader.readAsArrayBuffer(file)
            fileReader.onload =  () => {
                this.src = fileReader.result
            }
        }
    }
}
</script>
```

**3. 二进制文件预览**

如果后端给的不是CDN地址，而是一些POST接口，该接口返回二进制流，则可以调用接口获取文件的ArrayBuffer数据，传递给src属性。

```vue
<template>
    <vue-office-docx
        :src="docx"
        style="height: 100vh;"
        @rendered="rendered"
    />
</template>

<script>
//引入VueOfficeDocx组件
import VueOfficeDocx from '@vue3-office/docx'
//引入相关样式
import '@vue3-office/docx/lib/index.css'

export default {
    components:{
        VueOfficeDocx
    },
    data(){
        return {
            docx: ''
        }
    },
    mounted(){
        fetch('你的API文件地址', {
            method: 'post'
        }).then(res=>{
            //读取文件的arrayBuffer
            res.arrayBuffer().then(res=>{
                this.docx = res
            })
        })
    },
    methods:{
        rendered(){
            console.log("渲染完成")
        }
    }
}
</script>
```

</details>

<details>
<summary>excel 文件预览示例 </summary>

通过网络地址预览示例如下，通过文件ArrayBuffer预览和上面docx的使用方式一致。
```vue
<script setup lang="ts">
    import type { OfficeBaseComponentProps } from '../types';

    import { ref, watch } from 'vue';

    import VueOfficeExcel from '@vue3-office/excel';

    import '@vue3-office/excel/lib/index.css';

    interface Props extends OfficeBaseComponentProps {
        isFullscreen?: boolean;
    }

    const props = withDefaults(defineProps<Props>(), {
        options: () => ({
            // 在默认渲染的列表宽度上再加5px宽
            widthOffset: 5,
            // 在默认渲染的列表高度上再加5px高
            heightOffset: 5,
        }),
        isFullscreen: false,
    });

    const emit = defineEmits<{
        error: [Error];
        loaded: [void];
    }>();

    const excelRef = ref();

    const handleRendered = () => {
        emit('loaded');
    };

    const handleError = (error: Error) => {
        emit('error', error);
        console.error('Excel 文档加载失败:', error);
    };

    // 监听全屏状态变化，使用组件重新创建策略
    watch(
        () => props.isFullscreen,
        (_newValue, oldValue) => {
            // 跳过初始化
            if (oldValue === undefined) return;
            // 等待modal动画完成后再重新创建组件
            const animationDelay = 300;
            setTimeout(() => {
                excelRef.value.reRender();
                // 强制重新创建组件
            }, animationDelay);
        },
    );
</script>

<template>
    <div class="office-excel h-full">
        <div class="office-excel-content">
            <VueOfficeExcel
                ref="excelRef"
                :src="props.src"
                :options="props.options"
                @rendered="handleRendered"
                @error="handleError"
            />
        </div>
    </div>
</template>

<style scoped>
    .office-excel {
        display: flex;
        flex-direction: column;
        position: relative;
        overflow: hidden;
    }

    .office-excel-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
    }

    .office-excel-content :deep(.vue-office-excel) {
        flex: 1;
        height: 100%;
    }
    /* 重写dropdown高度 */
    .office-excel-content
    :deep(.x-spreadsheet-bottombar .x-spreadsheet-dropdown-content) {
        max-height: calc(100vh - 350px) !important;
    }

    .office-excel-content :deep(canvas) {
        width: 100% !important;
        height: 100% !important;
    }

    /* 确保Excel组件在所有模式下都能正确填充容器 */
    .office-excel-content :deep(.vue-office-excel) {
        width: 100% !important;
        height: 100% !important;
        display: flex !important;
        flex-direction: column !important;
    }

    /* 确保x-spreadsheet容器正确填充 */
    .office-excel-content :deep(.x-spreadsheet) {
        width: 100% !important;
        height: 100% !important;
        flex: 1 !important;
    }
</style>

```
</details>

<details>
<summary>pdf 文件预览示例 </summary>

通过网络地址预览示例如下，通过文件ArrayBuffer预览和上面docx的使用方式一致。
```vue
<template>
    <vue-office-pdf
        :src="pdf"
        style="height: 100vh"
        @rendered="renderedHandler"
        @error="errorHandler"
    />
</template>

<script>
//引入VueOfficePdf组件
import VueOfficePdf from '@vue3-office/pdf'

export default {
    components: {
        VueOfficePdf
    },
    data() {
        return {
            pdf: 'http://static.shanhuxueyuan.com/test.pdf' //设置文档地址
        }
    },
    methods: {
        renderedHandler() {
            console.log("渲染完成")
        },
        errorHandler() {
            console.log("渲染失败")
        }
    }
}
</script>
```

</details>


<details>
<summary>pptx 文件预览示例 </summary>

通过网络地址预览示例如下，通过文件ArrayBuffer预览和上面docx的使用方式一致。
```vue
<template>
    <vue-office-pptx
        :src="pdf"
        style="height: 100vh"
        @rendered="renderedHandler"
        @error="errorHandler"
    />
</template>

<script>
import VueOfficePptx from '@vue3-office/pptx'

export default {
    components: {
        VueOfficePptx
    },
    data() {
        return {
            pdf: 'http://****/test.pptx' //设置文档地址
        }
    },
    methods: {
        renderedHandler() {
            console.log("渲染完成")
        },
        errorHandler() {
            console.log("渲染失败")
        }
    }
}
</script>
```

</details>

## 项目结构

```
vue-office/
├── core/              # 主项目（组件库 + 演示应用）
│   ├── packages/     # 组件包源码
│   └── src/          # 演示应用
├── demo-vue3/        # Vue3 使用示例
└── examples/         # 构建输出目录
```

## 开发指南

详见 [core/README.md](./core/README.md)

## 项目依赖的第三方库

- **docx**：基于 docx-preview 库实现
- **pdf**：基于 pdfjs 库实现，实现了虚拟列表增加性能
- **excel**：基于 exceljs 和 x-data-spreadsheet 实现，全网样式支持更好
- **pptx**：基于自研库 [pptx-preview](https://github.com/501351981/pptx-preview) 实现


