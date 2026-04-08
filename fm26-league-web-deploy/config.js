// ==================== FM26 联赛管理系统 - 配置文件 ====================

// 默认配置（可在设置页面修改）
const DEFAULT_CONFIG = {
    appId: '',
    apiKey: '',
    matchTableId: '',
    teamTableId: '',
    transferTableId: '',
    announcementTableId: '',
    cupTableId: '',
};

// 从 localStorage 加载配置
function loadConfig() {
    const saved = localStorage.getItem('fm26_config');
    if (saved) {
        return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
    }
    return { ...DEFAULT_CONFIG };
}

// 保存配置到 localStorage
function saveConfigToStorage(config) {
    localStorage.setItem('fm26_config', JSON.stringify(config));
}

// 当前配置
let CONFIG = loadConfig();

// 简道云 API 基础 URL
const JIANDAOYUN_BASE = 'https://www.jiandaoyun.com/open/api/v1/app';

// 生成 API 签名
function generateSignature(timestamp) {
    return CryptoJS.MD5(timestamp + CONFIG.apiKey).toString();
}

// 获取请求头
function getHeaders() {
    const timestamp = Date.now().toString();
    const signature = generateSignature(timestamp);
    
    return {
        'Content-Type': 'application/json',
        'X-JDY-TIMESTAMP': timestamp,
        'X-JDY-SIGNATURE': signature,
    };
}

// 通用 API 请求函数
async function jdyRequest(method, endpoint, data = null) {
    const url = `${JIANDAOYUN_BASE}/${CONFIG.appId}${endpoint}`;
    const headers = getHeaders();
    
    const options = {
        method,
        headers,
    };
    
    if (data) {
        options.body = JSON.stringify(data);
    }
    
    try {
        const response = await fetch(url, options);
        const result = await response.json();
        
        if (result.code === 0) {
            return result.data;
        } else {
            console.error('简道云 API 错误:', result);
            showAlert(`API 错误：${result.message || '未知错误'}`, 'error');
            return null;
        }
    } catch (error) {
        console.error('网络请求失败:', error);
        showAlert(`网络错误：${error.message}`, 'error');
        return null;
    }
}

// 搜索数据
async function searchData(tableId, filters = null, limit = 100) {
    const data = { limit, skip: 0 };
    if (filters) {
        data.filters = filters;
    }
    return await jdyRequest('POST', `/entry/${tableId}/search`, data);
}

// 创建数据
async function createData(tableId, data) {
    return await jdyRequest('POST', `/entry/${tableId}/create`, { data });
}

// 更新数据
async function updateData(tableId, entryId, data) {
    return await jdyRequest('POST', `/entry/${tableId}/update`, { entry_id: entryId, data });
}

// 删除数据
async function deleteData(tableId, entryIds) {
    return await jdyRequest('POST', `/entry/${tableId}/delete`, { entry_ids: entryIds });
}

// 测试 API 连接
async function testJdyConnection() {
    if (!CONFIG.appId || !CONFIG.apiKey) {
        showAlert('请先配置 App ID 和 API Key', 'error');
        return false;
    }
    
    try {
        const result = await searchData(CONFIG.matchTableId, null, 1);
        if (result !== null) {
            showAlert('连接成功！', 'success');
            return true;
        }
        return false;
    } catch (error) {
        showAlert(`连接失败：${error.message}`, 'error');
        return false;
    }
}
