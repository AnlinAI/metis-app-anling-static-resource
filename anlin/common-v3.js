axios.defaults.timeout = 60000;
const API = {
    _getCurrentLanguage: () => {
        // 1. 从URL参数获取
        const urlParams = new URLSearchParams(window.location.search);
        const langFromUrl = urlParams.get('lang');
        if (langFromUrl) return langFromUrl;
        
        // 2. 从Cookie获取
        const langFromCookie = UTILS.cookie.get('language');
        if (langFromCookie) return langFromCookie;

         // 3. 从全局配置获取
         if (window.appConfig?.currentLocale) return window.appConfig.currentLocale;
        
        
        // 4. 默认中文
        return 'zh';
    },
    _getCommonHeaders: () => {
        const currentLang = API._getCurrentLanguage();
        const token = UTILS.cookie.get('token');
        const uid = UTILS.cookie.get('uid');
        const tid = UTILS.cookie.get('tid');
        return {
            'Content-Type': 'application/json',
            'Accept-Language': currentLang,
            'X-Locale': currentLang,
            'X-Token': token,
            'X-Uid': uid,
            'X-Tid': tid
        };
    },
    _handleResponse:(result)=>{
        if (result.code === 403 || result.data.code === 403) {
            window.location = "/login.html";
            return Promise.reject({ code: 403, message: window.i18n?.boots?.global?.js?.api?.unauthorized || '未授权访问' });
        }
        if (result.code === 500) {
            UI.showToast('danger',  result.message || window.i18n?.boots?.global?.js?.api?.serverError || '服务器内部错误');
            return Promise.reject(result);
        }
        if (result.code === 400 ) {
            UI.showToast('danger', result.message || window.i18n?.boots?.global?.js?.api?.requestFailed || '请求处理失败');
            return Promise.reject(result);
        }
        if (result.code === 404) {
            UI.showToast('danger', result.message || window.i18n?.boots?.global?.js?.api?.notFound || '请求处理失败');
            return Promise.reject(result);
        }
        return result.data
    },
    _handleError: (error) => {
        // 网络错误或其他异常
        console.error("Request failed:", error);
        if (error.response) {
            // 服务器返回了错误状态码
            const status = error.response.status;
            const message = error.response.data?.message || window.i18n?.boots?.global?.js?.api?.requestFailed || '请求失败';
            UI.showToast('danger', `${status}: ${message}`);
        } else if (error.request) {
            // 请求发出但没有收到响应
            UI.showToast('danger', window.i18n?.boots?.global?.js?.api?.networkError || '网络连接失败，请检查网络');
        } else {
            // 其他错误
            UI.showToast('danger', window.i18n?.boots?.global?.js?.api?.requestFailed || '请求处理失败');
        }
    },
    post: async ({ url, data }) => {
        url = url.startsWith('/') ? url : '/' + url;
        url = "/api" + url
        try {
            const response = await axios.post(url, data || {}, { 
                headers: API._getCommonHeaders() ,
                timeout: 60000
            });
            if (!response || !response.data) return null;
            return API._handleResponse(response);
        } catch (error) {
            API._handleError(error);
            return Promise.reject(error);
        }
    },
    
    get: async ({ url, params }) => {
        url = url.startsWith('/') ? url : '/' + url;
        url = "/api" + url
        try {
            const response = await axios.get(url, { params });
            if (!response || !response.data) return null;
            return API._handleResponse(response.data);
        } catch (error) {
            console.error("GET Request failed:", error);
            API._handleError(error);
            return Promise.reject(error);
        }
    }
} 

const UTILS = {
    cookie: {
        set: (name, value, days = 7) => {
            const expires = new Date()
            expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000))
            document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`
        },
        
        get: (name) => {
            const nameEQ = name + "="
            const ca = document.cookie.split(';')
            for (let i = 0; i < ca.length; i++) {
                let c = ca[i]
                while (c.charAt(0) === ' ') c = c.substring(1, c.length)
                if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length)
            }
            return null
        },
        
        remove: (name) => {
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`
        }
    },
    url: {
        getParam: (name) => {
            const urlParams = new URLSearchParams(window.location.search);
            return urlParams.get(name);
        },
        setParam: (name, value) => {
            const urlParams = new URLSearchParams(window.location.search);
            urlParams.set(name, value);
            window.history.pushState({}, '', `${window.location.pathname}?${urlParams.toString()}`);
        },
        remove:(name) => {
            const url = new URL(window.location.href); 
            url.searchParams.delete(name);            
          
            if (!url.search) {
              url.search = '';
            }
          
            window.history.replaceState(
              {}, 
              document.title, 
              url.href  
            );
        }
    },
    form: {
        getFormData: (form) => {
            const formData = $(form).serialize();
            return formData;
        },
        getFormJsonData: (form) => {
            const formData = $(form).serializeArray().reduce(function(obj, item) {
                obj[item.name] = item.value;
                return obj;
            }, {});
            return formData;
        }
    },
    input:{
       getValue:(id)=>{
            const value = $(id).val()
            if( !value || value === "") return null
            else return value
       }
    },
    clipboard:{
        copy: (text) => {
            navigator.clipboard.writeText(text);
            UI.Toast.info('复制到剪贴板成功: '+text);
        }
    },
    value:{
        simpleId:(id)=>{
            return id.substring(0,10) + `...<span style="cursor: pointer;font-size: 12px;" onclick="UTILS.clipboard.copy('${id}')"><i class="fa fa-copy" aria-hidden="true"></i></span>`
        },
        simpleBool:(bool)=>{
            return bool ? '是' : '否'
        },
        getOrElse:(value,defaultValue)=>{
            if(value){
                return value
            }else{
                return defaultValue
            }
        },
        milliSecondsToSeconds:(value)=>{
            return Math.round(Number(value || 0) / 1000)
        }
    },
    storage:{
        session: {
            set:(key, value)=>{
                sessionStorage.setItem(key,value)
            },
            get:(key) =>{
                sessionStorage.getItem(key)
            },
            remove:(key) =>{
                sessionStorage.setItem(key,undefined)
            }
        },
        local:{
            set:(key, value)=>{     
                return localStorage.setItem(key,value)
            },
            get:(key) =>{
                const value = localStorage.getItem(key)
                return value
            },
            remove:(key) =>{
                return localStorage.removeItem(key)
            }
        }
    },
    async:{
        button: (config)=>{
            const {
                buttonId,
                promise,
                onCallback,
            } = config

            const landaButton = Ladda.create($(buttonId)[0])
            landaButton.start()

            promise.then((response) => {
                landaButton.stop()
                if(onCallback){
                    onCallback(response)
                }
            }).catch((error) => {
                landaButton.stop()
                console.log("error", error);
            });
        }
    }
}
window.UTILS = UTILS;

// 🎨 现代科幻风格UI工具函数
const UI = {
    // ==================== 私有变量 ==================== 
    _toastContainer: null,
    _toastCount: 0,

    // ==================== 私有方法 ==================== 
    
    /**
     * 私有方法：获取或创建Toast容器
     * @private
     */
    _getToastContainer: function() {
        if(!this._toastContainer){
            if($("#toast-container").length > 0){
                this._toastContainer = $("#toast-container");
            }
            else {
                this._toastContainer = $(`
                    <div id="toast-container" class="toast-container">
                        <div class="toast-backdrop"></div>
                    </div>
                `);
                $('body').append(this._toastContainer);
            }
        }
        return this._toastContainer;
    },

    /**
     * 私有方法：隐藏单个Toast
     * @private
     * @param {string} toastId - Toast ID
     */
    _hideToast: function(toastId) {
        const toastEl = $(`#${toastId}`);
        if (toastEl.length) {
            toastEl.find(".animate").addClass("toast-hidden");
            toastEl.addClass('toast-hidden');
            setTimeout(() => {
                toastEl.remove();
                // 如果容器为空，清理容器
                if (this._toastContainer && this._toastContainer.children().length === 0) {
                    this._toastContainer.remove();
                    this._toastContainer = null;
                }
            }, 300);
        }
    },

    /**
     * 私有方法：生成唯一ID
     * @private
     */
    _generateId: function(prefix = 'ai-element') {
        return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
    },

    /**
     * 私有方法：图标映射
     * @private
     */
    _getIconForType: function(type) {
        const iconMap = {
            success: 'fas fa-check-circle',
            danger: 'fas fa-times-circle', 
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };
        return iconMap[type] || iconMap.info;
    },

    // ==================== 公共方法 ==================== 

    /**
     * 显示AI风格通知提示
     * @param {string} type - 提示类型：success, danger, warning, info
     * @param {string} message - 提示内容
     * @param {object} options - 其他选项
     * @returns {Object} Toast控制对象
     */
    showToast: function(type, message, options = {}) {
        const defaultOptions = {
            delay: 3000,
            autohide: true,
            showIcon: true
        };

        const finalOptions = { ...defaultOptions, ...options };
        const toastId = 'metis-toast-' + (++this._toastCount);

        // 创建Toast元素
        // const toastEl = $(`
        //     <div id="${toastId}" class="ai-toast ai-toast-${type}">
        //         <div class="ai-toast-content">
        //             ${finalOptions.showIcon ? `
        //                 <div class="ai-toast-icon">
        //                     <i class="${this._getIconForType(type)}"></i>
        //                 </div>
        //             ` : ''}
        //             <div class="ai-toast-message">${message}</div>
        //             <button class="ai-toast-close" type="button">
        //                 <i class="fas fa-times"></i>
        //             </button>
        //         </div>
        //     </div>
        // `);

        const toastEl = $(`
            <div id="${toastId}" class="metis-toast metis-toast-${type}">
                <div class="notify animate">
                    <button class="toast-close" type="button">
                        <i class="fas fa-times"></i>
                    </button>
                    <div class="icon">
                        <i class="${this._getIconForType(type)}"></i>
                    </div>
                    
                    <!-- <span class="title">${message}</span> -->
                    <span class="subtitle">${message}</span>
                </div>
            </div>
        `);


        // 添加到容器
        this._getToastContainer().append(toastEl);

        // 绑定关闭事件
        toastEl.find('.toast-close').on('click', () => {
            this._hideToast(toastId);
        });

        //自动隐藏
        if (finalOptions.autohide) {
            setTimeout(() => {
                this._hideToast(toastId);
            }, finalOptions.delay);
        }

        // 返回控制对象
        return {
            id: toastId,
            element: toastEl,
            hide: () => this._hideToast(toastId)
        };
    },

    /**
     * 手动隐藏Toast（公共方法）
     * @param {string} toastId - Toast ID
     */
    hideToast: function(toastId) {
        return this._hideToast(toastId);
    },

    /**
     * AI风格确认对话框
     * @param {string} title - 对话框标题
     * @param {string} message - 对话框内容
     * @param {object} options - 其他选项
     * @returns {Promise} 返回Promise，确认为resolve，取消为reject
     */
    confirm: function(title, message, options = {}) {
        const defaultOptions = {
            confirmText: '确认',
            cancelText: '取消',
            icon: 'fas fa-question-circle',
            type: 'default', // default, warning, danger
            confirmButtonClass: 'ai-btn-primary', // 兼容旧版本
            size: 'modal-md' // 兼容旧版本
        };

        const finalOptions = { ...defaultOptions, ...options };
        const modalId = this._generateId('ai-modal');

        return new Promise((resolve, reject) => {
            const modalEl = $(`
                <div id="${modalId}" class="ai-modal">
                    <div class="ai-modal-content">
                        <div class="ai-modal-header">
                            <h5 class="ai-modal-title">
                                <i class="${finalOptions.icon}"></i>
                                ${title}
                            </h5>
                        </div>
                        <div class="ai-modal-body">
                            ${message}
                        </div>
                        <div class="ai-modal-footer">
                            <button type="button" class="ai-btn ai-btn-secondary" id="${modalId}-cancel">
                                ${finalOptions.cancelText}
                            </button>
                            <button type="button" class="ai-btn ai-btn-primary" id="${modalId}-confirm">
                                ${finalOptions.confirmText}
                            </button>
                        </div>
                    </div>
                </div>
            `);

            $('body').append(modalEl);

            // 确认按钮事件
            $(`#${modalId}-confirm`).on('click', function() {
                modalEl.remove();
                resolve();
            });

            // 取消按钮事件  
            $(`#${modalId}-cancel`).on('click', function() {
                modalEl.remove();
                reject();
            });

            // 点击背景关闭
            modalEl.on('click', function(e) {
                if (e.target === this) {
                    modalEl.remove();
                    reject();
                }
            });

            // ESC键关闭
            $(document).on('keydown.aiModal', function(e) {
                if (e.key === 'Escape') {
                    modalEl.remove();
                    $(document).off('keydown.aiModal');
                    reject();
                }
            });

            // 清理事件绑定
            modalEl.on('remove', function() {
                $(document).off('keydown.aiModal');
            });
        });
    },

    /**
     * AI风格加载遮罩
     * @param {boolean} show - 是否显示
     * @param {string} message - 加载文本
     */
    loading: function(show, message = 'AI正在处理中...') {
        const loaderId = 'ai-global-loader';
        
        if (show) {
            if ($(`#${loaderId}`).length === 0) {
                const loaderEl = $(`
                    <div id="${loaderId}" class="ai-loader">
                        <div class="ai-loader-content">
                            <div class="ai-spinner"></div>
                            <div class="ai-loader-text">${message}</div>
                        </div>
                    </div>
                `);
                $('body').append(loaderEl);
            } else {
                // 更新加载文本
                $(`#${loaderId} .ai-loader-text`).text(message);
            }
        } else {
            $(`#${loaderId}`).remove();
        }
    },
};

UI.Toast = {
    success: (message) => {
        UI.showToast('success', message);
    },
    error: (message) => {
        UI.showToast('danger', message);
    },
    warning: (message) => {
        UI.showToast('warning', message);
    },
    info: (message) => {
        UI.showToast('info', message);
    }
}

// 模态窗口管理器 - 用于管理页面中的交互弹出层
UI.Modal = {
    _activeModals: new Map(), // 存储活动的模态窗口
    _zIndexBase: 9000,        // 基础层级，低于Toast的10000+
    _backdropClass: 'modal-manager-backdrop',

    /**
     * 显示模态窗口
     * @param {string} selector - 模态窗口选择器
     * @param {Object} options - 配置选项
     * @returns {Object} 模态窗口控制器
     */
    show: function(selector, options = {}) {
        const defaultOptions = {
            backdrop: true,           // 是否显示遮罩
            keyboard: true,           // ESC键关闭
            closeOnBackdrop: true,    // 点击遮罩关闭
            autoFocus: true,          // 自动聚焦
            onShow: null,             // 显示回调
            onHide: null,             // 隐藏回调
            onShown: null,            // 显示完成回调
            onHidden: null,            // 隐藏完成回调
            title: null,               // 标题
        };

        const finalOptions = { ...defaultOptions, ...options };
        const modalEl = $("#"+selector);

        if (modalEl.length === 0) {
            console.error(`模态窗口 ${selector} 不存在`);
            return null;
        }

        const modalId = modalEl.attr('id') || selector.replace('#', '');
        
        // 如果已经显示，直接返回控制器
        if (this._activeModals.has(modalId)) {
            return this._activeModals.get(modalId);
        }

        // 执行显示前回调
        if (finalOptions.onShow) {
            finalOptions.onShow(modalEl);
        }

        // 计算层级
        const currentZIndex = this._zIndexBase + this._activeModals.size * 10;
        
        // 移动到body末尾（如果不在的话）
        if (modalEl.parent()[0] !== document.body) {
            modalEl.appendTo('body');
        }

        // 创建遮罩层
        let backdrop = null;
        if (finalOptions.backdrop) {
            backdrop = this._createBackdrop(currentZIndex - 1);
            $('body').append(backdrop);
        }

        // 设置模态窗口样式
        modalEl.css({
            'display': 'block',
            'z-index': currentZIndex,
            'position': 'fixed',
            'top': '0',
            'left': '0',
            'width': '100%',
            'height': '100%',
            'overflow': 'auto'
        });

        // 添加显示动画类
        modalEl.addClass('show');

        //标题设置
        if(finalOptions.title){
            modalEl.find(".modal-title").text(finalOptions.title);
        }

        // 创建控制器
        const controller = {
            id: modalId,
            element: modalEl,
            backdrop: backdrop,
            options: finalOptions,
            zIndex: currentZIndex,

            hide: () => {
                return UI.Modal.hide(modalId);
            },

            updateContent: (content) => {
                modalEl.find('.modal-body').html(content);
                return controller;
            },

            getFormData: () => {
                const formData = {};
                modalEl.find('input, select, textarea').each(function() {
                    const field = $(this);
                    const name = field.attr('name') || field.attr('id');
                    if (name) {
                        if (field.attr('type') === 'checkbox') {
                            formData[name] = field.is(':checked');
                        } else {
                            formData[name] = field.val();
                        }
                    }
                });
                return formData;
            }
        };

        // 绑定事件
        this._bindEvents(controller);

        // 存储控制器
        this._activeModals.set(modalId, controller);

        // 自动聚焦
        if (finalOptions.autoFocus) {
            setTimeout(() => {
                const focusTarget = modalEl.find('input:visible:first, select:visible:first, textarea:visible:first, button:visible:first');
                if (focusTarget.length) {
                    focusTarget.focus();
                }
            }, 150);
        }

        // 执行显示完成回调
        setTimeout(() => {
            if (finalOptions.onShown) {
                finalOptions.onShown(modalEl, controller);
            }
        }, 150);

        return controller;
    },

    /**
     * 隐藏模态窗口
     * @param {string} modalId - 模态窗口ID
     * @returns {boolean} 是否成功隐藏
     */
    hide: function(modalId) {
        const controller = this._activeModals.get(modalId);
        if (!controller) {
            return false;
        }

        const { element: modalEl, backdrop, options } = controller;

        // 执行隐藏前回调
        if (options.onHide) {
            options.onHide(modalEl, controller);
        }

        // 移除显示动画类
        modalEl.removeClass('show');

        // 隐藏动画
        setTimeout(() => {
            modalEl.css('display', 'none');
            
            // 移除遮罩
            if (backdrop) {
                backdrop.remove();
            }

            // 清除事件绑定
            this._unbindEvents(controller);

            // 从活动列表中移除
            this._activeModals.delete(modalId);

            // 执行隐藏完成回调
            if (options.onHidden) {
                options.onHidden(modalEl, controller);
            }
        }, 150);

        return true;
    },

    /**
     * 隐藏所有模态窗口
     */
    hideAll: function() {
        Array.from(this._activeModals.keys()).forEach(modalId => {
            this.hide(modalId);
        });
    },

    /**
     * 获取活动的模态窗口控制器
     * @param {string} modalId - 模态窗口ID
     * @returns {Object|null} 控制器
     */
    get: function(modalId) {
        return this._activeModals.get(modalId) || null;
    },

    /**
     * 检查模态窗口是否显示
     * @param {string} modalId - 模态窗口ID
     * @returns {boolean} 是否显示
     */
    isShown: function(modalId) {
        return this._activeModals.has(modalId);
    },

    // 私有方法：创建遮罩层
    _createBackdrop: function(zIndex) {
        return $(`
            <div class="${this._backdropClass}" style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.5);
                z-index: ${zIndex};
                opacity: 0;
                transition: opacity 0.15s ease;
            "></div>
        `).animate({ opacity: 1 }, 150);
    },

    // 私有方法：绑定事件
    _bindEvents: function(controller) {
        const { element: modalEl, backdrop, options, id } = controller;

        // ESC键关闭
        if (options.keyboard) {
            $(document).on(`keydown.modal-${id}`, (e) => {
                if (e.key === 'Escape') {
                    this.hide(id);
                }
            });
        }

        // 点击遮罩关闭
        if (options.closeOnBackdrop && backdrop) {
            backdrop.on('click', () => {
                this.hide(id);
            });
        }

        // 绑定关闭按钮
        modalEl.find('[data-bs-dismiss="modal"], [data-dismiss="modal"]').on(`click.modal-${id}`, (e) => {
            e.preventDefault();
            this.hide(id);
        });

        // 防止模态窗口内容区点击冒泡到遮罩
        modalEl.find('.modal-dialog, .modal-content').on(`click.modal-${id}`, (e) => {
            e.stopPropagation();
        });

        // 点击模态窗口外部关闭
        if (options.closeOnBackdrop) {
            modalEl.on(`click.modal-${id}`, (e) => {
                if (e.target === modalEl[0]) {
                    this.hide(id);
                }
            });
        }
    },

    // 私有方法：解绑事件
    _unbindEvents: function(controller) {
        const { element: modalEl, backdrop, id } = controller;
        
        $(document).off(`keydown.modal-${id}`);
        modalEl.off(`click.modal-${id}`);
        modalEl.find('.modal-dialog, .modal-content').off(`click.modal-${id}`);
        modalEl.find('[data-bs-dismiss="modal"], [data-dismiss="modal"]').off(`click.modal-${id}`);
        
        if (backdrop) {
            backdrop.off('click');
        }
    }
};


UI.Form = {
    createFormVM(config) {
        const {
            formId,
            validates,
            onSuccess,
        } = config

        const rules = validates.rules || {}
        const messages = validates.messages || {}

        // document.querySelector('#loginFormSubmitButton2')

        const submitButton = $(formId).find('.ladda-button.submit-button')
        if(submitButton.length > 0){
            config.submitButtonLadda = Ladda.create(submitButton[0])
        }

        const $form = $(formId).validate({
            rules: rules,
            messages: messages,
            showErrors: function(errorMap, errorList) {
                // 清除所有之前的错误状态
                $('.validate-input').removeClass('error');

                if($form.showErrorsMessage){
                    $form.showErrorsMessage("")
                }

                // 为每个错误字段添加错误状态
                $.each(this.errorList, function(index, error) {
                    const container = $(error.element).parent('.validate-input');
                    container.addClass('error').attr('data-validate', error.message);
                });
            },
            // errorPlacement: function(error, element) {  

            //     // var thisAlert = element.parent();
            //     // $(thisAlert).addClass('alert-validate');

            //     if(error && error.length > 0){
            //         let errorText = error[0].innerText;
            //         element.parent().addClass('error').attr('data-validate', errorText)
            //     }
            //     // error.appendTo(element.parent());  
            // },
            // errorClass: "alert-validate",
            // errorElement: "div",

            onfocusout: function (element) {
                $(element).valid();
            },
            onkeyup: function (element) {
                $(element).valid();
            },
            submitHandler: function (form) {
                
                const data = UTILS.form.getFormJsonData(form);
                if(onSuccess) {
                    for (const property in data) {
                        if (data.hasOwnProperty(property)) {
                            const value = data[property];
                            if(value === "") {
                                data[property] = undefined
                            }
                        }
                    }
                    onSuccess(data)
                }
                return false
            }
        })

        $form.showErrorsMessage= (text)=>{
           const $error = $(formId).find(".metis-form-error")
           if($error){
                $error.text(text)
           }
           else {
                if(text != ""){
                    UI.Toast.error(text);
                }
           }
        }

        $form.startLoading = () => {
            if(config.submitButtonLadda){
                config.submitButtonLadda.start()
            }
        }
        $form.stopLoading = () => {
            if(config.submitButtonLadda){
                config.submitButtonLadda.stop()
            }
        }

        return $form
    }
}

UI.AreaBind = {
    clear: (areaId) =>{
        const area = $(areaId)
        const $elements = area.find(`[metis-area-data-bind]`);
        $elements.each(function () {
            $element = $(this)
            if ($element.is('img')) {
                $element.attr('src', '');
            } else if ($element.is('input[type="checkbox"]')) {
                $element.prop('checked', false);
            } else if ($element.is('input[type="radio"]')) {
                $element.prop('checked', false);
            } else if ($element.is('input[type="hidden"]')) {
                $element.val('');
            } else if ($element.is('input[type="text"], input[type="email"], input[type="password"], input[type="number"], input[type="date"]')) {
                $element.val('');
            } else if ($element.is('select')) {
                $element.val(null); // 清空单选下拉框
            } else if ($element.is('select[multiple]')) {
                $element.val(null); // 清空多选下拉框
            } else if ($element.is('textarea')) {
                $element.val('');
            } else {
                $element.text('');
            }

        });
    },
    bindObject: (config) =>{
        const {
            data,
            areaId
        } = config

        const $vm = {
            data: data
        }

        const area = $(areaId)

        for (const property in $vm.data) {
            if ($vm.data.hasOwnProperty(property)) {
                // 获取对应的值
                const value = $vm.data[property];
        
                // 查找匹配的元素，不局限于span
                const $element = area.find(`[metis-area-data-bind="${property}"]`);
        
                // 如果找到元素，则更新文本内容
                if ($element.length) {
                    if($element.is('img')){
                        $element.attr('src', value);
                    }
                    else if($element.is('input[type="checkbox"]')){
                        $element.prop('checked', value);
                    }
                    else if($element.is('input[type="hidden"]')){
                        $element.val(value);
                    }
                    else if($element.is('select')){
                        $element.val(String(value));
                    }
                    else if($element.is('select[multiple]')){
                        $element.val(value);
                    }
                    else if($element.is('textarea')){
                        $element.val(value);
                    }
                    else if ($element.is('input[type="text"], input[type="email"], input[type="password"], input[type="number"], input[type="date"]')) {
                        $element.val(value);
                    }
                    else {
                        $element.text(value);
                    }
                }

                // 检查属性是否是对象，以处理嵌套属性
                if (typeof value === 'object' && value !== null) {
                    // 遍历嵌套属性
                    for (const nestedProperty in value) {
                        if (value.hasOwnProperty(nestedProperty)) {
                            const nestedValue = value[nestedProperty];
                            const fullPropertyPath = `${property}.${nestedProperty}`;
                            
                            // 查找匹配的嵌套属性元素
                            const $nestedElement = area.find(`[metis-area-data-bind="${fullPropertyPath}"]`);
                            
                            if ($nestedElement.length) {
                                if ($nestedElement.is('img')) {
                                    $nestedElement.attr('src', nestedValue);
                                } 
                                else if($nestedElement.is('select')){
                                    $nestedElement.val(nestedValue);
                                }
                                else if($nestedElement.is('input[type="hidden"]')){
                                    $nestedElement.val(nestedValue);
                                }
                                else if($nestedElement.is('select[multiple]')){
                                    $nestedElement.val(nestedValue);
                                }
                                else if($nestedElement.is('input[type="checkbox"]')){
                                    $nestedElement.prop('checked', nestedValue);
                                }
                                else if ($nestedElement.is('input[type="text"], input[type="email"], input[type="password"], input[type="number"], input[type="date"]')) {
                                    $nestedElement.val(value);
                                }
                                else if($nestedElement.is('textarea')){
                                    $nestedElement.val(nestedValue);
                                } else {
                                    $nestedElement.text(nestedValue);
                                }
                            }
                        }
                    }
                }
            }
        }

    },
    bindAsync: (config) => {
        let {
            promise,
            areaId,
            onSuccess
        } = config
        if(!areaId.startsWith("#")){
            areaId = "#"+areaId
        }
        const area = $(areaId)

        const $vm = {
            element:{
                loading: area.find("[metis-area-loading]"),
                data: area.find("[metis-area-data]")
            },
            data:{},
            loading:{
                show:()=>{
                    if($vm.element.loading && $vm.element.loading.length > 0){
                        $vm.element.loading.show()
                        $vm.element.data.hide()
                    }
                },
                hide:()=>{
                    if($vm.element.loading && $vm.element.loading.length > 0){
                        $vm.element.loading.hide()
                        $vm.element.data.show()
                    }
                }
            },
            render: (data) => {
                $vm.data = data
                for (const property in $vm.data) {
                    if ($vm.data.hasOwnProperty(property)) {
                        // 获取对应的值
                        const value = $vm.data[property];
                
                        // 查找匹配的元素，不局限于span
                        const $element = area.find(`[metis-area-data-bind="${property}"]`);
                
                        // 如果找到元素，则更新文本内容
                        if ($element.length) {
                            if($element.is('img')){
                                $element.attr('src', value);
                            }
                            else if($element.is('input[type="checkbox"]')){
                                $element.prop('checked', value);
                            }
                            else if($element.is('input[type="hidden"]')){
                                $element.val(value);
                            }
                            else if($element.is('select')){
                                $element.val(String(value));
                            }
                            else if($element.is('select[multiple]')){
                                $element.val(String(value));
                            }
                            else if($element.is('textarea')){
                                $element.val(value);
                            }
                            else if ($element.is('input[type="text"], input[type="email"], input[type="password"], input[type="number"], input[type="date"]')) {
                                $element.val(value);
                            }
                            else {
                                $element.text(value);
                            }
                        }

                        // 检查属性是否是对象，以处理嵌套属性
                        if (typeof value === 'object' && value !== null) {
                            // 遍历嵌套属性
                            for (const nestedProperty in value) {
                                if (value.hasOwnProperty(nestedProperty)) {
                                    const nestedValue = value[nestedProperty];
                                    const fullPropertyPath = `${property}.${nestedProperty}`;
                                    
                                    // 查找匹配的嵌套属性元素
                                    const $nestedElement = area.find(`[metis-area-data-bind="${fullPropertyPath}"]`);
                                    
                                    if ($nestedElement.length) {
                                        if ($nestedElement.is('img')) {
                                            $nestedElement.attr('src', nestedValue);
                                        } 
                                        else if($nestedElement.is('input[type="checkbox"]')){
                                            $nestedElement.prop('checked', nestedValue);
                                        }
                                        else if($nestedElement.is('input[type="hidden"]')){
                                            $nestedElement.val(nestedValue);
                                        }
                                        else if($nestedElement.is('select')){
                                            $nestedElement.val(nestedValue);
                                        }
                                        else if($nestedElement.is('select[multiple]')){
                                            $nestedElement.val(nestedValue);
                                        }
                                        else if($nestedElement.is('textarea')){
                                            $nestedElement.val(nestedValue);
                                        }
                                        else if ($nestedElement.is('input[type="text"], input[type="email"], input[type="password"], input[type="number"], input[type="date"]')) {
                                            $nestedElement.val(value);
                                        }
                                        else {
                                            $nestedElement.text(nestedValue);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        $vm.loading.show()


        promise.then((res) => {
            $vm.loading.hide()
            if(res.success){ 
                $vm.render(res.data) 
                if(onSuccess){
                    onSuccess(res)
                }
            }
            else{ UI.Toast.error(res.message);  }
        }).catch((error) => {
           $vm.loading.hide()
           UI.Toast.error(error.message);
        });
    }
}



// Tab组件工厂 - 支持多种类型的Tab组件

const TabComponentFactory = {
    /**
     * 创建页面刷新型Tab组件
     * @param {Object} config 配置对象
     * @param {string} config.tabContainerId - Tab容器ID
     * @param {string} config.tabContentId - Tab内容容器ID  
     * @param {string} config.urlParamName - URL参数名称
     * @param {Object} config.tabs - Tab配置
     * @param {string} config.defaultTab - 默认Tab
     * @param {Function} config.onTabInit - Tab初始化回调
     */
    createRefreshTab(config) {
        const {
            tabContainerId,
            tabContentId,
            urlParamName = 'tab',
            tabs = {},
            defaultTab,
            onTabInit
        } = config

        const tabComponent = {
            _data: {
                tabContainerId: tabContainerId,
                tabContentId: tabContentId,
                urlParamName: urlParamName,
                currentTab: defaultTab,
                tabs: tabs
            },

            _elements: {
                // 获取Tab容器
                getTabContainer: () => {
                    return $(`#${tabComponent._data.tabContainerId}`)
                },

                // 获取Tab内容容器
                getTabContentContainer: () => {
                    return $(`#${tabComponent._data.tabContentId}`)
                },

                // 获取所有Tab按钮（限定在当前容器内）
                getTabButtons: () => {
                    return $(`#${tabComponent._data.tabContainerId} button[data-bs-toggle="tab"]`)
                },

                // 获取所有TabPane（限定在当前容器内）
                getTabPanes: () => {
                    return $(`#${tabComponent._data.tabContentId} .tab-pane`)
                },

                // 激活指定的Tab
                activeTab: (tabId, paneId) => {
                    // 移除所有Tab的active状态（限定在当前容器内）
                    tabComponent._elements.getTabButtons().removeClass('active').attr('aria-selected', 'false')
                    tabComponent._elements.getTabPanes().removeClass('show active')
                    
                    // 激活指定的Tab和TabPane
                    $(`#${tabId}`).addClass('active').attr('aria-selected', 'true')
                    $(`#${paneId}`).addClass('show active')
                    
                    tabComponent._data.currentTab = tabId
                },

                // 基于URL参数初始化Tab显示
                initByUrlParam: () => {
                    const paramValue = UTILS.url.getParam(tabComponent._data.urlParamName)
                    let targetTab = null

                    // 根据URL参数找到对应的Tab配置
                    if (paramValue) {
                        Object.keys(tabComponent._data.tabs).forEach(tabId => {
                            const tabConfig = tabComponent._data.tabs[tabId]
                            if (tabConfig.urlValue === paramValue) {
                                targetTab = tabConfig
                            }
                        })
                    }

                    // 如果没有找到，使用默认Tab
                    if (!targetTab && tabComponent._data.defaultTab) {
                        targetTab = tabComponent._data.tabs[tabComponent._data.defaultTab]
                    }

                    // 激活Tab并执行初始化回调
                    if (targetTab) {
                        tabComponent._elements.activeTab(targetTab.tabId, targetTab.paneId)
                        
                        // 执行Tab特定的初始化回调
                        if (targetTab.onInit) {
                            targetTab.onInit()
                        }
                    }
                },

                // Tab点击事件处理
                handleTabClick: function(e) {
                    e.preventDefault()
                    
                    // 使用 currentTarget 确保获取到按钮元素（事件绑定在button上，currentTarget始终是button）
                    // 即使点击的是按钮内的子元素（如span），也能正确获取按钮ID
                    const targetTabId = $(e.currentTarget).attr('id')
                    const targetTabConfig = tabComponent._data.tabs[targetTabId]
                    
                    if (!targetTabConfig) return
                    
                    if (tabComponent._data.currentTab === targetTabId) {
                        return
                    }
                    
                    // 设置URL参数并刷新页面
                    UTILS.url.setParam(tabComponent._data.urlParamName, targetTabConfig.urlValue)
                    window.location.reload()
                },

                // 绑定Tab点击事件
                bindTabEvents: () => {
                    tabComponent._elements.getTabButtons().on('click', tabComponent._elements.handleTabClick)
                }
            },

            // 公共API方法

            // 手动切换到指定Tab
            switchToTab: (tabId) => {
                const tabConfig = tabComponent._data.tabs[tabId]
                if (tabConfig) {
                    UTILS.url.setParam(tabComponent._data.urlParamName, tabConfig.urlValue)
                    window.location.reload()
                }
            },

            // 获取当前活动Tab
            getCurrentTab: () => {
                return tabComponent._data.currentTab
            },

            // 获取Tab配置
            getTabConfig: (tabId) => {
                return tabComponent._data.tabs[tabId]
            },

            // 初始化Tab组件
            init: () => {
                // 绑定Tab事件
                tabComponent._elements.bindTabEvents()
                
                // 基于URL参数初始化Tab显示
                tabComponent._elements.initByUrlParam()

                // 执行全局初始化回调
                if (onTabInit) {
                    onTabInit(tabComponent)
                }

                return tabComponent
            },

            // 销毁Tab组件（清理事件绑定）
            destroy: () => {
                tabComponent._elements.getTabButtons().off('click', tabComponent._elements.handleTabClick)
            }
        }

        return tabComponent
    }
}

// 列表组件工厂 - 支持多种类型的列表组件
const ListComponentFactory = {
    /**
     * 创建页面刷新型列表组件
     * @param {Object} config 配置对象
     * @param {string} config.containerId - 列表容器ID
     * @param {string} config.tableId - 表格ID
     * @param {string} config.apiUrl - API请求地址
     * @param {Object} config.queryParams - 查询参数
     * @param {Function} config.renderRow - 行渲染函数
     * @param {Function} config.onSuccess - 成功回调
     * @param {Function} config.onError - 错误回调
     * @param {Object} config.pagination - 分页配置
     * @param {Object} config.selection - 选择功能配置
     */
    createRefreshList(config) {
        const {
            containerId,
            tableId,
            apiUrl,
            queryParams = {},
            renderRow,
            onSuccess,
            onError,
            pagination = {},
            emptyMessage = null, // 🔧 新增：空数据提示配置
            selection = null // 🔧 新增：选择功能配置
        } = config

        // 🔧 修复1: 设置完整的默认分页配置
        const defaultPagination = {
            pageParamName: 'page',
            pageSizeParamName: 'size',
            defaultPageSize: 10,
            showPageInfo: true,
            pageInfoSelector: null, // 将基于tableId自动生成
            paginationSelector: null, // 将基于tableId自动生成
            maxVisiblePages: 10, // 🔧 新增：默认显示10页
            showFirstLast: true // 🔧 新增：始终显示第一页和最后一页
        }
        
        // 合并用户配置和默认配置
        const finalPagination = { ...defaultPagination, ...pagination }
        
        // 🔧 修复3: 基于tableId生成选择器
        if (!finalPagination.pageInfoSelector) {
            finalPagination.pageInfoSelector = `#${tableId}Info`
        }
        if (!finalPagination.paginationSelector) {
            finalPagination.paginationSelector = `#${tableId}Pagination`
        }

        // 🔧 新增：默认空数据提示配置
        const defaultEmptyMessage = `
            <div class="text-muted">
                <i class="fas fa-inbox fa-2x mb-2"></i><br>
                暂无数据
            </div>
        `

        // 🔧 新增：选择功能默认配置
        const defaultSelection = {
            enabled: false,
            mode: 'multiple', // single 或 multiple
            idField: 'id', // 数据项中用作唯一标识的字段名
            headerCheckbox: true, // 是否显示表头的全选复选框
            onSelectionChange: null // 选择变化回调函数
        }
        const finalSelection = selection ? { ...defaultSelection, ...selection } : null

        const listComponent = {
            _data: {
                containerId: containerId,
                tableId: tableId,
                apiUrl: apiUrl,
                loading: false,
                list: [],
                total: 0,
                currentPage: 1,
                pageSize: finalPagination.defaultPageSize,
                emptyMessage: emptyMessage || defaultEmptyMessage, // 🔧 新增：存储空数据提示
                selectedItems: new Set(), // 🔧 新增：存储选中项的ID
                allSelected: false // 🔧 新增：全选状态
            },

            _config: {
                queryParams: queryParams // 保留原始queryParams配置
            },

            _pagination: finalPagination,
            _selection: finalSelection, // 🔧 新增：选择功能配置

            _elements: {
                // 获取列表容器
                getContainer: () => {
                    return $(`#${listComponent._data.containerId}`)
                },

                // 获取表格
                getTable: () => {
                    // return $(`#${listComponent._data.tableId}`)
                    return $(`#${listComponent._data.containerId}`).find("[metis-list-table]")
                },

                // 获取表格body
                getTableBody: () => {
                    // return $(`#${listComponent._data.tableId} tbody`)
                    return $(`#${listComponent._data.containerId}`).find("[metis-list-table] tbody")
                },

                // 🔧 修复3: 基于tableId的ID定位
                getPageInfo: () => {
                    // return $(listComponent._pagination.pageInfoSelector)
                    return $(`#${listComponent._data.containerId}`).find("[metis-list-info]")
                },

                // 🔧 修复3: 基于tableId的ID定位
                getPagination: () => {
                    // return $(listComponent._pagination.paginationSelector)
                    return $(`#${listComponent._data.containerId}`).find("[metis-list-pagination]")
                },

                // 🔧 新增：获取表格头部列数，用于设置colspan
                getTableColumnCount: () => {
                    // const tableHead = $(`#${listComponent._data.tableId} thead tr:first th`)
                    const tableHead = $(`#${listComponent._data.containerId}`).find("[metis-list-table] thead tr:first th")
                    return tableHead.length || 1
                },

                // 🔧 新增：处理选择列的表头渲染
                renderSelectionHeader: () => {
                    if (!listComponent._selection?.enabled) return

                    const tableHead = $(`#${listComponent._data.containerId}`).find("[metis-list-table] thead tr:first")
                    if (tableHead.length === 0) return

                    // 检查是否已经有选择列
                    if (tableHead.find('th[data-selection-header]').length > 0) return

                    let headerHtml = ''
                    if (listComponent._selection.mode === 'multiple' && listComponent._selection.headerCheckbox) {
                        const containerId = listComponent._data.containerId
                        headerHtml = `
                            <th scope="col" class="w-50" data-selection-header>
                                <input type="checkbox" class="form-check-input" id="selectAll" 
                                       data-container-id="${containerId}">
                            </th>
                        `
                    } else if (listComponent._selection.mode === 'single') {
                        headerHtml = `<th scope="col" class="w-50" data-selection-header>选择</th>`
                    } else {
                        headerHtml = `<th scope="col" class="w-50" data-selection-header>选择</th>`
                    }

                    tableHead.prepend(headerHtml)
                },

                // 🔧 新增：处理全选/取消全选
                toggleSelectAll: () => {
                    if (!listComponent._selection?.enabled) return

                    const selectAllCheckbox = $(`#${listComponent._data.containerId}`).find('#selectAll')
                    const isChecked = selectAllCheckbox.is(':checked')
                    
                    if (isChecked) {
                        // 全选
                        listComponent._data.selectedItems.clear()
                        listComponent._data.list.forEach(item => {
                            const itemId = item[listComponent._selection.idField]
                            listComponent._data.selectedItems.add(itemId)
                        })
                        listComponent._data.allSelected = true
                    } else {
                        // 取消全选
                        listComponent._data.selectedItems.clear()
                        listComponent._data.allSelected = false
                    }

                    // 更新所有行的复选框状态
                    listComponent._elements.updateRowCheckboxes()
                    
                    // 触发选择变化回调
                    listComponent._elements.triggerSelectionChange()
                },

                // 🔧 新增：更新行复选框状态
                updateRowCheckboxes: () => {
                    if (!listComponent._selection?.enabled) return

                    const tableBody = listComponent._elements.getTableBody()
                    tableBody.find('input[type="checkbox"][data-item-id]').each(function() {
                        const itemId = $(this).data('item-id')
                        $(this).prop('checked', listComponent._data.selectedItems.has(itemId))
                    })
                },

                // 🔧 新增：处理单行选择
                toggleRowSelection: (itemId) => {
                    if (!listComponent._selection?.enabled) return

                    if (listComponent._selection.mode === 'single') {
                        // 单选模式：清除其他选择
                        listComponent._data.selectedItems.clear()
                        listComponent._data.selectedItems.add(itemId)
                        listComponent._data.allSelected = false
                    } else {
                        // 多选模式：切换当前项
                        if (listComponent._data.selectedItems.has(itemId)) {
                            listComponent._data.selectedItems.delete(itemId)
                        } else {
                            listComponent._data.selectedItems.add(itemId)
                        }
                        
                        // 更新全选状态
                        listComponent._data.allSelected = listComponent._data.selectedItems.size === listComponent._data.list.length
                    }

                    // 更新UI状态
                    listComponent._elements.updateSelectionUI()
                    
                    // 触发选择变化回调
                    listComponent._elements.triggerSelectionChange()
                },

                // 🔧 新增：更新选择相关的UI状态
                updateSelectionUI: () => {
                    if (!listComponent._selection?.enabled) return

                    // 更新全选复选框状态
                    const selectAllCheckbox = $(`#${listComponent._data.containerId}`).find('#selectAll')
                    if (selectAllCheckbox.length > 0) {
                        selectAllCheckbox.prop('checked', listComponent._data.allSelected)
                        selectAllCheckbox.prop('indeterminate', 
                            listComponent._data.selectedItems.size > 0 && !listComponent._data.allSelected)
                    }

                    // 更新行复选框状态
                    listComponent._elements.updateRowCheckboxes()
                },

                // 🔧 新增：触发选择变化回调
                triggerSelectionChange: () => {
                    if (listComponent._selection?.onSelectionChange) {
                        const selectedIds = Array.from(listComponent._data.selectedItems)
                        const selectedItems = listComponent._data.list.filter(item => 
                            listComponent._data.selectedItems.has(item[listComponent._selection.idField]))
                        
                        listComponent._selection.onSelectionChange(selectedIds, selectedItems)
                    }
                },

                // 设置加载状态
                setLoading: (isLoading) => {
                    listComponent._data.loading = isLoading
                    
                    const tableBody = listComponent._elements.getTableBody()
                    const colspan = listComponent._elements.getTableColumnCount()
                    
                    if (isLoading) {
                        // 显示加载状态
                        tableBody.html(`
                            <tr class="table-loading-row">
                                <td colspan="${colspan}" class="text-center py-4">
                                    <div class="d-flex justify-content-center align-items-center">
                                        <div class="spinner-border spinner-border-sm me-2" role="status">
                                            <span class="visually-hidden">加载中...</span>
                                        </div>
                                        <span>加载中...</span>
                                    </div>
                                </td>
                            </tr>
                        `)
                        
                    }
                },


                // 渲染列表数据
                renderList: () => {
                    const tableBody = listComponent._elements.getTableBody()
                    const colspan = listComponent._elements.getTableColumnCount()
                    
                    // 🔧 新增：渲染选择列表头
                    listComponent._elements.renderSelectionHeader()
                    
                    if (listComponent._data.list.length === 0) {
                        // 🔧 修复：显示空数据状态，使用CSS样式控制高度
                        tableBody.html(`
                            <tr class="table-empty-row">
                                <td colspan="${colspan}" class="text-center">
                                    <div class="d-flex align-items-center justify-content-center h-100">
                                        ${listComponent._data.emptyMessage}
                                    </div>
                                </td>
                            </tr>
                        `)
                    } else {
                        // 清空表格并渲染数据
                        tableBody.empty()
                        listComponent._data.list.forEach((item, index) => {
                            if (renderRow) {
                                const itemId = item[listComponent._selection?.idField || 'id']
                                let rowHtml = renderRow(item, index, listComponent._data)
                                
                                // 🔧 新增：如果启用了选择功能，在行首添加选择列
                                if (listComponent._selection?.enabled) {
                                    let selectionCell = ''
                                    if (listComponent._selection.mode === 'multiple') {
                                        const isChecked = listComponent._data.selectedItems.has(itemId)
                                        const containerId = listComponent._data.containerId
                                        selectionCell = `
                                            <td>
                                                <input type="checkbox" class="form-check-input list-row-checkbox" 
                                                       data-item-id="${itemId}" 
                                                       data-container-id="${containerId}"
                                                       ${isChecked ? 'checked' : ''}>
                                            </td>
                                        `
                                    } else if (listComponent._selection.mode === 'single') {
                                        const isChecked = listComponent._data.selectedItems.has(itemId)
                                        const containerId = listComponent._data.containerId
                                        selectionCell = `
                                            <td>
                                                <input type="radio" class="form-check-input list-row-radio" 
                                                       name="listSelection_${containerId}" 
                                                       data-item-id="${itemId}"
                                                       data-container-id="${containerId}"
                                                       ${isChecked ? 'checked' : ''}>
                                            </td>
                                        `
                                    }
                                    
                                    // 在行HTML的第一个<td>前插入选择列
                                    if (selectionCell) {
                                        rowHtml = rowHtml.replace(/(<tr[^>]*>)/, `$1${selectionCell}`)
                                    }
                                }
                                
                                tableBody.append(rowHtml)
                            }
                        })
                        
                        // 🔧 新增：渲染完成后更新选择状态
                        if (listComponent._selection?.enabled) {
                            listComponent._elements.updateSelectionUI()
                        }
                    }
                },

                // 渲染分页信息
                renderPageInfo: () => {
                    if (!listComponent._pagination.showPageInfo) return

                    const pageInfo = listComponent._elements.getPageInfo()
                    if (pageInfo.length === 0) return

                    if (listComponent._data.total === 0) {
                        pageInfo.text('共 0 条记录')
                        return
                    }

                    const startRecord = (listComponent._data.currentPage - 1) * listComponent._data.pageSize + 1
                    const endRecord = Math.min(listComponent._data.currentPage * listComponent._data.pageSize, listComponent._data.total)
                    
                    pageInfo.text(`显示 ${startRecord}-${endRecord} 条，共 ${listComponent._data.total} 条记录`)
                },

                // 🔧 修复2: 分页控件始终显示，确保在容器底部
                renderPagination: () => {
                    const pagination = listComponent._elements.getPagination()
                    if (pagination.length === 0) return

                    const totalPages = Math.ceil(listComponent._data.total / listComponent._data.pageSize)
                    const currentPage = listComponent._data.currentPage

                    // 🔧 修复2: 即使只有一页或没有数据也显示分页容器，保持布局一致
                    if (totalPages <= 1) {
                        // 显示一个简单的分页信息，而不是完全隐藏
                        if (listComponent._data.total === 0) {
                            pagination.empty() // 没有数据时不显示任何分页
                        } else {
                            // 只有一页时显示简单的分页信息
                            pagination.html(`
                                <li class="page-item active">
                                    <span class="page-link">1</span>
                                </li>
                            `)
                        }
                        return
                    }

                    let paginationHtml = ''

                    // 上一页
                    const prevDisabled = currentPage <= 1 ? 'disabled' : ''
                    paginationHtml += `
                        <li class="page-item ${prevDisabled}">
                            <a class="page-link" href="#" data-page="${currentPage - 1}" ${prevDisabled ? 'tabindex="-1"' : ''}>上一页</a>
                        </li>
                    `

                    // 🔧 改进：智能分页显示逻辑
                    const maxVisible = listComponent._pagination.maxVisiblePages || 10
                    const showFirstLast = listComponent._pagination.showFirstLast !== false
                    
                    let startPage, endPage
                    
                    if (totalPages <= maxVisible) {
                        // 总页数不超过最大显示数，显示所有页
                        startPage = 1
                        endPage = totalPages
                    } else {
                        // 总页数超过最大显示数，智能计算显示范围
                        const halfVisible = Math.floor(maxVisible / 2)
                        
                        if (currentPage <= halfVisible) {
                            // 当前页靠前，显示前几页
                            startPage = 1
                            endPage = maxVisible
                        } else if (currentPage >= totalPages - halfVisible) {
                            // 当前页靠后，显示后几页
                            startPage = totalPages - maxVisible + 1
                            endPage = totalPages
                        } else {
                            // 当前页在中间，以当前页为中心显示
                            startPage = currentPage - halfVisible
                            endPage = currentPage + halfVisible
                        }
                    }

                    // 显示第一页（如果不在范围内且启用）
                    if (showFirstLast && startPage > 1) {
                        paginationHtml += `
                            <li class="page-item">
                                <a class="page-link" href="#" data-page="1">1</a>
                            </li>
                        `
                        if (startPage > 2) {
                            paginationHtml += `
                                <li class="page-item disabled">
                                    <span class="page-link">...</span>
                                </li>
                            `
                        }
                    }

                    // 显示页码
                    for (let i = startPage; i <= endPage; i++) {
                        const activeClass = i === currentPage ? 'active' : ''
                        paginationHtml += `
                            <li class="page-item ${activeClass}">
                                <a class="page-link" href="#" data-page="${i}">${i}</a>
                            </li>
                        `
                    }

                    // 显示最后一页（如果不在范围内且启用）
                    if (showFirstLast && endPage < totalPages) {
                        if (endPage < totalPages - 1) {
                            paginationHtml += `
                                <li class="page-item disabled">
                                    <span class="page-link">...</span>
                                </li>
                            `
                        }
                        paginationHtml += `
                            <li class="page-item">
                                <a class="page-link" href="#" data-page="${totalPages}">${totalPages}</a>
                            </li>
                        `
                    }

                    // 下一页
                    const nextDisabled = currentPage >= totalPages ? 'disabled' : ''
                    paginationHtml += `
                        <li class="page-item ${nextDisabled}">
                            <a class="page-link" href="#" data-page="${currentPage + 1}">下一页</a>
                        </li>
                    `

                    pagination.html(paginationHtml)
                },

                // 绑定分页事件
                bindPaginationEvents: () => {
                    listComponent._elements.getPagination().off('click', '.page-link').on('click', '.page-link', function(e) {
                        e.preventDefault()
                        
                        const $this = $(this)
                        if ($this.parent().hasClass('disabled') || $this.parent().hasClass('active')) {
                            return
                        }

                        const targetPage = parseInt($this.data('page'))
                        if (targetPage && targetPage !== listComponent._data.currentPage) {
                            // 设置URL参数并刷新页面
                            UTILS.url.setParam(listComponent._pagination.pageParamName, targetPage)
                            window.location.reload()
                        }
                    })
                },

                // 从URL参数初始化分页
                initFromUrlParams: () => {
                    const pageFromUrl = UTILS.url.getParam(listComponent._pagination.pageParamName)
                    if (pageFromUrl) {
                        listComponent._data.currentPage = parseInt(pageFromUrl) || 1
                    }

                    const pageSizeFromUrl = UTILS.url.getParam(listComponent._pagination.pageSizeParamName)
                    if (pageSizeFromUrl) {
                        listComponent._data.pageSize = parseInt(pageSizeFromUrl) || listComponent._pagination.defaultPageSize
                    }
                },
                bindSelectionEvents: () => {
                    if (!listComponent._selection?.enabled) return
                    
                    const container = listComponent._elements.getContainer()
                    
                    // 绑定全选复选框事件
                    container.off('change', `#selectAll[data-container-id="${containerId}"]`)
                             .on('change', `#selectAll[data-container-id="${containerId}"]`, function() {
                        const checkbox = $(this)
                        const checked = checkbox.prop('checked')
                        
                        if (checked) {
                            listComponent.selectAll()
                        } else {
                            listComponent.clearSelection()
                        }
                    })
                    
                    // 绑定行复选框/单选框事件
                    container.off('change', `.list-row-checkbox[data-container-id="${containerId}"], .list-row-radio[data-container-id="${containerId}"]`)
                             .on('change', `.list-row-checkbox[data-container-id="${containerId}"], .list-row-radio[data-container-id="${containerId}"]`, function() {
                        const $input = $(this)
                        const itemId = $input.data('item-id')
                        const checked = $input.prop('checked')
                        
                        if (listComponent._selection.mode === 'single') {
                            // 单选模式
                            if (checked) {
                                listComponent._data.selectedItems.clear()
                                listComponent._data.selectedItems.add(itemId)
                            }
                        } else {
                            // 多选模式
                            if (checked) {
                                listComponent._data.selectedItems.add(itemId)
                            } else {
                                listComponent._data.selectedItems.delete(itemId)
                            }
                            
                            // 更新全选状态
                            listComponent._data.allSelected = listComponent._data.selectedItems.size === listComponent._data.list.length
                        }
                        
                        // 更新UI
                        listComponent._elements.updateSelectionUI()
                        
                        // 触发回调
                        listComponent._elements.triggerSelectionChange()
                    })
                }
            },

            // 公共API方法

            // 🔧 新增：更新空数据提示
            setEmptyMessage: (message) => {
                listComponent._data.emptyMessage = message
                // 如果当前是空数据状态，重新渲染
                if (listComponent._data.list.length === 0 && !listComponent._data.loading) {
                    listComponent._elements.renderList()
                }
            },

            // 刷新列表数据
            refresh: (newQueryParams = {}) => {
                // 每次都动态获取queryParams
                const baseQueryParams = getQueryParams(listComponent._config.queryParams);
                const mergedQueryParams = { ...baseQueryParams, ...newQueryParams };

                // 设置加载状态
                listComponent._elements.setLoading(true)

                // 构建请求参数
                const requestParams = {
                    ...mergedQueryParams,
                    pager: {
                        "page": listComponent._data.currentPage,
                        "size": listComponent._data.pageSize
                    }
                }

                // 发送请求
                return API.post({
                    url: listComponent._data.apiUrl,
                    data: requestParams
                }).then((res) => {
                    if (res.success) {
                        // 更新数据
                        listComponent._data.list = res.data.records || []
                        listComponent._data.total = res.data.total || 0

                        // 渲染列表
                        listComponent._elements.renderList()
                        listComponent._elements.renderPageInfo()
                        listComponent._elements.renderPagination()

                        // 执行成功回调
                        if (onSuccess) {
                            onSuccess(res, listComponent._data)
                        }
                    } else {
                        // 处理业务错误
                        if (onError) {
                            onError(res.message || '查询失败', res)
                        } else {
                            UI.showToast('danger', res.message || '查询失败')
                        }
                    }
                }).catch((error) => {
                    console.error('列表查询失败:', error)
                    
                    // 显示错误状态
                    const colspan = listComponent._elements.getTableColumnCount()
                    listComponent._elements.getTableBody().html(`
                        <tr class="table-empty-row">
                            <td colspan="${colspan}" class="text-center">
                                <div class="d-flex align-items-center justify-content-center h-100">
                                    <div class="text-danger">
                                        <i class="fas fa-exclamation-triangle fa-2x mb-2"></i><br>
                                        数据加载失败
                                    </div>
                                </div>
                            </td>
                        </tr>
                    `)

                    // 执行错误回调
                    if (onError) {
                        onError(error.message || '网络请求失败', error)
                    } else {
                        UI.showToast('danger', '数据加载失败')
                    }
                }).finally(() => {
                    // 恢复加载状态
                    listComponent._elements.setLoading(false)
                })
            },

            // 跳转到指定页
            goToPage: (page) => {
                UTILS.url.setParam(listComponent._pagination.pageParamName, page)
                window.location.reload()
            },

            // 更新查询参数并刷新
            updateQuery: (newParams) => {
                // 重置到第一页
                UTILS.url.setParam(listComponent._pagination.pageParamName, 1)
                
                // 设置查询参数到URL
                Object.keys(newParams).forEach(key => {
                    if (newParams[key] !== null && newParams[key] !== undefined && newParams[key] !== '') {
                        UTILS.url.setParam(key, newParams[key])
                    } else {
                        // 移除空参数
                        const urlParams = new URLSearchParams(window.location.search)
                        urlParams.delete(key)
                        window.history.pushState({}, '', `${window.location.pathname}?${urlParams.toString()}`)
                    }
                })
                
                window.location.reload()
            },

            // 🔧 新增：重置到第一页并刷新
            resetToFirstPage: () => {
                UTILS.url.setParam(listComponent._pagination.pageParamName, 1)
                window.location.reload()
            },

            // 获取当前数据
            getData: () => {
                return {
                    list: listComponent._data.list,
                    total: listComponent._data.total,
                    currentPage: listComponent._data.currentPage,
                    pageSize: listComponent._data.pageSize,
                    queryParams: listComponent._config.queryParams
                }
            },

            // 🔧 新增：获取选中项的ID数组
            getSelectedIds: () => {
                if (!listComponent._selection?.enabled) return []
                return Array.from(listComponent._data.selectedItems)
            },

            // 🔧 新增：获取选中项的完整数据
            getSelectedItems: () => {
                if (!listComponent._selection?.enabled) return []
                return listComponent._data.list.filter(item => 
                    listComponent._data.selectedItems.has(item[listComponent._selection.idField]))
            },

            // 🔧 新增：设置选中项（通过ID数组）
            setSelectedIds: (ids) => {
                if (!listComponent._selection?.enabled) return

                listComponent._data.selectedItems.clear()
                ids.forEach(id => {
                    // 检查ID是否存在于当前列表中
                    if (listComponent._data.list.some(item => item[listComponent._selection.idField] === id)) {
                        listComponent._data.selectedItems.add(id)
                    }
                })

                // 更新全选状态
                listComponent._data.allSelected = listComponent._data.selectedItems.size === listComponent._data.list.length

                // 更新UI
                listComponent._elements.updateSelectionUI()
                
                // 触发回调
                listComponent._elements.triggerSelectionChange()
            },

            // 🔧 新增：清空选择
            clearSelection: () => {
                if (!listComponent._selection?.enabled) return

                listComponent._data.selectedItems.clear()
                listComponent._data.allSelected = false

                // 更新UI
                listComponent._elements.updateSelectionUI()
                
                // 触发回调
                listComponent._elements.triggerSelectionChange()
            },

            // 🔧 新增：全选当前页
            selectAll: () => {
                if (!listComponent._selection?.enabled) return

                listComponent._data.selectedItems.clear()
                listComponent._data.list.forEach(item => {
                    const itemId = item[listComponent._selection.idField]
                    listComponent._data.selectedItems.add(itemId)
                })
                listComponent._data.allSelected = true

                // 更新UI
                listComponent._elements.updateSelectionUI()
                
                // 触发回调
                listComponent._elements.triggerSelectionChange()
            },

            // 🔧 新增：获取选择状态信息
            getSelectionInfo: () => {
                if (!listComponent._selection?.enabled) {
                    return {
                        enabled: false,
                        selectedCount: 0,
                        totalCount: 0,
                        allSelected: false
                    }
                }

                return {
                    enabled: true,
                    selectedCount: listComponent._data.selectedItems.size,
                    totalCount: listComponent._data.list.length,
                    allSelected: listComponent._data.allSelected,
                    mode: listComponent._selection.mode,
                    selectedIds: Array.from(listComponent._data.selectedItems)
                }
            },

            // 初始化列表组件
            init: () => {
                // 从URL参数初始化分页
                listComponent._elements.initFromUrlParams()
                
                // 绑定分页事件
                listComponent._elements.bindPaginationEvents()

                listComponent._elements.bindSelectionEvents()
                
                // 🔧 新增：注册到全局选择管理器
                if (listComponent._selection?.enabled) {
                    ListSelectionManager.registerInstance(containerId, listComponent)
                }
                
                // 初始加载数据
                listComponent.refresh()

                return listComponent
            },

            // 销毁列表组件
            destroy: () => {
                const container = listComponent._elements.getContainer()
                
                listComponent._elements.getPagination().off('click', '.page-link')

                container.off('change', `#selectAll[data-container-id="${containerId}"]`)
                container.off('change', `.list-row-checkbox[data-container-id="${containerId}"], .list-row-radio[data-container-id="${containerId}"]`)
                
                
                // 🔧 新增：从全局选择管理器注销
                if (listComponent._selection?.enabled) {
                    ListSelectionManager.unregisterInstance(containerId)
                }
                
            }
        }

        return listComponent
    }
}

// ==================== 新增：无刷新型列表组件 ====================
/**
 * createAjaxList: 无刷新型列表组件，API与createRefreshList一致，分页/查询等操作通过ajax动态加载和渲染数据，无页面刷新
 * 
const list = ListComponentFactory.createAjaxList({
    containerId: 'myListContainer',
    tableId: 'myTable',
    apiUrl: '/api/xxx/list',
    renderRow: (item, idx, data) => {
        // 返回<tr>...</tr>
    },
    // 其他参数同createRefreshList
});
list.init();

如需监听筛选、查询等表单项变化，只需在对应input/select等元素上加 data-list-query 属性，查询按钮加 data-list-query-btn，即可实现无刷新查询。

 * @param {Object} config 配置对象，参数同createRefreshList
 */
ListComponentFactory.createAjaxList = function(config) {
    const {
        containerId,
        tableId,
        apiUrl,
        queryParams = {},
        renderRow,
        onSuccess,
        onError,
        pagination = {},
        emptyMessage = null,
        selection = null // 🔧 新增：选择功能配置
    } = config

    const defaultPagination = {
        pageParamName: 'page',
        pageSizeParamName: 'size',
        defaultPageSize: 10,
        showPageInfo: true,
        pageInfoSelector: null,
        paginationSelector: null
    }
    const finalPagination = { ...defaultPagination, ...pagination }
    if (!finalPagination.pageInfoSelector) {
        finalPagination.pageInfoSelector = `#${tableId}Info`
    }
    if (!finalPagination.paginationSelector) {
        finalPagination.paginationSelector = `#${tableId}Pagination`
    }
    const defaultEmptyMessage = `
        <div class="text-muted">
            <i class="fas fa-inbox fa-2x mb-2"></i><br>
            暂无数据
        </div>
    `
    
    // 🔧 新增：选择功能默认配置
    const defaultSelection = {
        enabled: false,
        mode: 'multiple', // single 或 multiple
        idField: 'id', // 数据项中用作唯一标识的字段名
        headerCheckbox: true, // 是否显示表头的全选复选框
        onSelectionChange: null // 选择变化回调函数
    }
    const finalSelection = selection ? { ...defaultSelection, ...selection } : null
    
    const listComponent = {
        _data: {
            containerId,
            tableId,
            apiUrl,
            loading: false,
            list: [],
            total: 0,
            currentPage: 1,
            pageSize: finalPagination.defaultPageSize,
            emptyMessage: emptyMessage || defaultEmptyMessage,
            selectedItems: new Set(), // 🔧 新增：存储选中项的ID
            allSelected: false // 🔧 新增：全选状态
        },
        _config: {
            queryParams: queryParams // 保留原始queryParams配置
        },
        _runtimeQueryParams: {}, // 新增：运行时查询参数
        _pagination: finalPagination,
        _selection: finalSelection, // 🔧 新增：选择功能配置
        _elements: {
            getContainer: () => $(`#${listComponent._data.containerId}`),
            getTable: () => $(`#${listComponent._data.containerId}`).find("[metis-list-table]"),
            getTableBody: () => $(`#${listComponent._data.containerId}`).find("[metis-list-table] tbody"),
            getPageInfo: () => $(`#${listComponent._data.containerId}`).find("[metis-list-info]"),
            getPagination: () => $(`#${listComponent._data.containerId}`).find("[metis-list-pagination]"),
            getTableColumnCount: () => {
                const tableHead = $(`#${listComponent._data.containerId}`).find("[metis-list-table] thead tr:first th")
                return tableHead.length || 1
            },

            // 🔧 新增：处理选择列的表头渲染
            renderSelectionHeader: () => {
                if (!listComponent._selection?.enabled) return

                const tableHead = $(`#${listComponent._data.containerId}`).find("[metis-list-table] thead tr:first")
                if (tableHead.length === 0) return

                // 检查是否已经有选择列
                if (tableHead.find('th[data-selection-header]').length > 0) return

                let headerHtml = ''
                if (listComponent._selection.mode === 'multiple' && listComponent._selection.headerCheckbox) {
                    const containerId = listComponent._data.containerId
                    headerHtml = `
                        <th scope="col" class="w-50" data-selection-header>
                            <input type="checkbox" class="form-check-input" id="selectAll" 
                                   data-container-id="${containerId}">
                        </th>
                    `
                } else if (listComponent._selection.mode === 'single') {
                    headerHtml = `<th scope="col" class="w-50" data-selection-header>选择</th>`
                } else {
                    headerHtml = `<th scope="col" class="w-50" data-selection-header>选择</th>`
                }

                tableHead.prepend(headerHtml)
            },

            // 🔧 新增：处理全选/取消全选
            toggleSelectAll: () => {
                if (!listComponent._selection?.enabled) return

                const selectAllCheckbox = $(`#${listComponent._data.containerId}`).find('#selectAll')
                const isChecked = selectAllCheckbox.is(':checked')
                
                if (isChecked) {
                    // 全选
                    listComponent._data.selectedItems.clear()
                    listComponent._data.list.forEach(item => {
                        const itemId = item[listComponent._selection.idField]
                        listComponent._data.selectedItems.add(itemId)
                    })
                    listComponent._data.allSelected = true
                } else {
                    // 取消全选
                    listComponent._data.selectedItems.clear()
                    listComponent._data.allSelected = false
                }

                // 更新所有行的复选框状态
                listComponent._elements.updateRowCheckboxes()
                
                // 触发选择变化回调
                listComponent._elements.triggerSelectionChange()
            },

            // 🔧 新增：更新行复选框状态
            updateRowCheckboxes: () => {
                if (!listComponent._selection?.enabled) return

                const tableBody = listComponent._elements.getTableBody()
                tableBody.find('input[type="checkbox"][data-item-id]').each(function() {
                    const itemId = $(this).data('item-id')
                    $(this).prop('checked', listComponent._data.selectedItems.has(itemId))
                })
            },

            // 🔧 新增：处理单行选择
            toggleRowSelection: (itemId) => {
                if (!listComponent._selection?.enabled) return

                if (listComponent._selection.mode === 'single') {
                    // 单选模式：清除其他选择
                    listComponent._data.selectedItems.clear()
                    listComponent._data.selectedItems.add(itemId)
                    listComponent._data.allSelected = false
                } else {
                    // 多选模式：切换当前项
                    if (listComponent._data.selectedItems.has(itemId)) {
                        listComponent._data.selectedItems.delete(itemId)
                    } else {
                        listComponent._data.selectedItems.add(itemId)
                    }
                    
                    // 更新全选状态
                    listComponent._data.allSelected = listComponent._data.selectedItems.size === listComponent._data.list.length
                }

                // 更新UI状态
                listComponent._elements.updateSelectionUI()
                
                // 触发选择变化回调
                listComponent._elements.triggerSelectionChange()
            },

            // 🔧 新增：更新选择相关的UI状态
            updateSelectionUI: () => {
                if (!listComponent._selection?.enabled) return

                // 更新全选复选框状态
                const selectAllCheckbox = $(`#${listComponent._data.containerId}`).find('#selectAll')
                if (selectAllCheckbox.length > 0) {
                    selectAllCheckbox.prop('checked', listComponent._data.allSelected)
                    selectAllCheckbox.prop('indeterminate', 
                        listComponent._data.selectedItems.size > 0 && !listComponent._data.allSelected)
                }

                // 更新行复选框状态
                listComponent._elements.updateRowCheckboxes()
            },

            // 🔧 新增：触发选择变化回调
            triggerSelectionChange: () => {
                if (listComponent._selection?.onSelectionChange) {
                    const selectedIds = Array.from(listComponent._data.selectedItems)
                    const selectedItems = listComponent._data.list.filter(item => 
                        listComponent._data.selectedItems.has(item[listComponent._selection.idField]))
                    
                    listComponent._selection.onSelectionChange(selectedIds, selectedItems)
                }
            },
            setLoading: (isLoading) => {
                listComponent._data.loading = isLoading
                const tableBody = listComponent._elements.getTableBody()
                const colspan = listComponent._elements.getTableColumnCount()
                if (isLoading) {
                    tableBody.html(`
                        <tr class="table-loading-row">
                            <td colspan="${colspan}" class="text-center py-4">
                                <div class="d-flex justify-content-center align-items-center">
                                    <div class="spinner-border spinner-border-sm me-2" role="status">
                                        <span class="visually-hidden">加载中...</span>
                                    </div>
                                    <span>加载中...</span>
                                </div>
                            </td>
                        </tr>
                    `)
                }
            },
            renderList: () => {
                const tableBody = listComponent._elements.getTableBody()
                const colspan = listComponent._elements.getTableColumnCount()
                
                // 🔧 新增：渲染选择列表头
                listComponent._elements.renderSelectionHeader()
                
                if (listComponent._data.list.length === 0) {
                    tableBody.html(`
                        <tr class="table-empty-row">
                            <td colspan="${colspan}" class="text-center">
                                <div class="d-flex align-items-center justify-content-center h-100">
                                    ${listComponent._data.emptyMessage}
                                </div>
                            </td>
                        </tr>
                    `)
                } else {
                    tableBody.empty()
                    listComponent._data.list.forEach((item, index) => {
                        if (renderRow) {
                            const itemId = item[listComponent._selection?.idField || 'id']
                            let rowHtml = renderRow(item, index, listComponent._data)
                            
                            // 🔧 新增：如果启用了选择功能，在行首添加选择列
                            if (listComponent._selection?.enabled) {
                                let selectionCell = ''
                                if (listComponent._selection.mode === 'multiple') {
                                    const isChecked = listComponent._data.selectedItems.has(itemId)
                                    const containerId = listComponent._data.containerId
                                    selectionCell = `
                                        <td>
                                            <input type="checkbox" class="form-check-input list-row-checkbox" 
                                                   data-item-id="${itemId}" 
                                                   data-container-id="${containerId}"
                                                   ${isChecked ? 'checked' : ''}>
                                        </td>
                                    `
                                } else if (listComponent._selection.mode === 'single') {
                                    const isChecked = listComponent._data.selectedItems.has(itemId)
                                    const containerId = listComponent._data.containerId
                                    selectionCell = `
                                        <td>
                                            <input type="radio" class="form-check-input list-row-radio" 
                                                   name="listSelection_${containerId}" 
                                                   data-item-id="${itemId}"
                                                   data-container-id="${containerId}"
                                                   ${isChecked ? 'checked' : ''}>
                                        </td>
                                    `
                                }
                                
                                // 在行HTML的第一个<td>前插入选择列
                                if (selectionCell) {
                                    rowHtml = rowHtml.replace(/(<tr[^>]*>)/, `$1${selectionCell}`)
                                }
                            }
                            
                            tableBody.append(rowHtml)
                        }
                    })
                    
                    // 🔧 新增：渲染完成后更新选择状态
                    if (listComponent._selection?.enabled) {
                        listComponent._elements.updateSelectionUI()
                    }
                }
            },
            renderPageInfo: () => {
                if (!listComponent._pagination.showPageInfo) return
                const pageInfo = listComponent._elements.getPageInfo()
                if (pageInfo.length === 0) return
                if (listComponent._data.total === 0) {
                    pageInfo.text('共 0 条记录')
                    return
                }
                const startRecord = (listComponent._data.currentPage - 1) * listComponent._data.pageSize + 1
                const endRecord = Math.min(listComponent._data.currentPage * listComponent._data.pageSize, listComponent._data.total)
                pageInfo.text(`显示 ${startRecord}-${endRecord} 条，共 ${listComponent._data.total} 条记录`)
            },
            renderPagination: () => {
                const pagination = listComponent._elements.getPagination()
                if (pagination.length === 0) return
                const totalPages = Math.ceil(listComponent._data.total / listComponent._data.pageSize)
                const currentPage = listComponent._data.currentPage
                if (totalPages <= 1) {
                    if (listComponent._data.total === 0) {
                        pagination.empty()
                    } else {
                        pagination.html(`
                            <li class="page-item active">
                                <span class="page-link">1</span>
                            </li>
                        `)
                    }
                    return
                }
                let paginationHtml = ''
                const prevDisabled = currentPage <= 1 ? 'disabled' : ''
                paginationHtml += `
                    <li class="page-item ${prevDisabled}">
                        <a class="page-link" href="#" data-page="${currentPage - 1}" ${prevDisabled ? 'tabindex="-1"' : ''}>上一页</a>
                    </li>
                `
                // 🔧 改进：智能分页显示逻辑
                const maxVisible = listComponent._pagination.maxVisiblePages || 10
                const showFirstLast = listComponent._pagination.showFirstLast !== false
                
                let startPage, endPage
                
                if (totalPages <= maxVisible) {
                    // 总页数不超过最大显示数，显示所有页
                    startPage = 1
                    endPage = totalPages
                } else {
                    // 总页数超过最大显示数，智能计算显示范围
                    const halfVisible = Math.floor(maxVisible / 2)
                    
                    if (currentPage <= halfVisible) {
                        // 当前页靠前，显示前几页
                        startPage = 1
                        endPage = maxVisible
                    } else if (currentPage >= totalPages - halfVisible) {
                        // 当前页靠后，显示后几页
                        startPage = totalPages - maxVisible + 1
                        endPage = totalPages
                    } else {
                        // 当前页在中间，以当前页为中心显示
                        startPage = currentPage - halfVisible
                        endPage = currentPage + halfVisible
                    }
                }

                // 显示第一页（如果不在范围内且启用）
                if (showFirstLast && startPage > 1) {
                    paginationHtml += `
                        <li class="page-item">
                            <a class="page-link" href="#" data-page="1">1</a>
                        </li>
                    `
                    if (startPage > 2) {
                        paginationHtml += `
                            <li class="page-item disabled">
                                <span class="page-link">...</span>
                            </li>
                        `
                    }
                }

                // 显示页码
                for (let i = startPage; i <= endPage; i++) {
                    const activeClass = i === currentPage ? 'active' : ''
                    paginationHtml += `
                        <li class="page-item ${activeClass}">
                            <a class="page-link" href="#" data-page="${i}">${i}</a>
                        </li>
                    `
                }

                // 显示最后一页（如果不在范围内且启用）
                if (showFirstLast && endPage < totalPages) {
                    if (endPage < totalPages - 1) {
                        paginationHtml += `
                            <li class="page-item disabled">
                                <span class="page-link">...</span>
                            </li>
                        `
                    }
                    paginationHtml += `
                        <li class="page-item">
                            <a class="page-link" href="#" data-page="${totalPages}">${totalPages}</a>
                        </li>
                    `
                }
                const nextDisabled = currentPage >= totalPages ? 'disabled' : ''
                paginationHtml += `
                    <li class="page-item ${nextDisabled}">
                        <a class="page-link" href="#" data-page="${currentPage + 1}">下一页</a>
                    </li>
                `
                pagination.html(paginationHtml)
                
                // 重新绑定分页事件
                listComponent._elements.bindPaginationEvents()
            },
            bindPaginationEvents: () => {
                const pagination = listComponent._elements.getPagination()
                pagination.off('click', '.page-link').on('click', '.page-link', function(e) {
                    e.preventDefault()
                    const $this = $(this)
                    if ($this.parent().hasClass('disabled') || $this.parent().hasClass('active')) {
                        return
                    }
                    const targetPage = parseInt($this.data('page'))
                    if (targetPage && targetPage !== listComponent._data.currentPage) {
                        listComponent.goToPage(targetPage)
                    }
                })
            },
            bindQueryEvents: () => {
                // 监听容器内所有带 data-list-query 的表单元素变化，自动刷新列表
                listComponent._elements.getContainer().find('[data-list-query]').off('change.ajaxList').on('change.ajaxList', function() {
                    const params = {}
                    listComponent._elements.getContainer().find('[data-list-query]').each(function() {
                        const $el = $(this)
                        const name = $el.attr('name')
                        if (name) {
                            params[name] = $el.val()
                        }
                    })
                    listComponent.updateQuery(params)
                })
                // 监听查询按钮
                listComponent._elements.getContainer().find('[data-list-query-btn]').off('click.ajaxList').on('click.ajaxList', function() {
                    const params = {}
                    listComponent._elements.getContainer().find('[data-list-query]').each(function() {
                        const $el = $(this)
                        const name = $el.attr('name')
                        if (name) {
                            params[name] = $el.val()
                        }
                    })
                    listComponent.updateQuery(params)
                })
            },
            bindSelectionEvents: () => {
                if (!listComponent._selection?.enabled) return
                
                const container = listComponent._elements.getContainer()
                
                // 绑定全选复选框事件
                container.off('change', `#selectAll[data-container-id="${containerId}"]`)
                         .on('change', `#selectAll[data-container-id="${containerId}"]`, function() {
                    const checkbox = $(this)
                    const checked = checkbox.prop('checked')
                    
                    if (checked) {
                        listComponent.selectAll()
                    } else {
                        listComponent.clearSelection()
                    }
                })
                
                // 绑定行复选框/单选框事件
                container.off('change', `.list-row-checkbox[data-container-id="${containerId}"], .list-row-radio[data-container-id="${containerId}"]`)
                         .on('change', `.list-row-checkbox[data-container-id="${containerId}"], .list-row-radio[data-container-id="${containerId}"]`, function() {
                    const $input = $(this)
                    const itemId = $input.data('item-id')
                    const checked = $input.prop('checked')
                    
                    if (listComponent._selection.mode === 'single') {
                        // 单选模式
                        if (checked) {
                            listComponent._data.selectedItems.clear()
                            listComponent._data.selectedItems.add(itemId)
                        }
                    } else {
                        // 多选模式
                        if (checked) {
                            listComponent._data.selectedItems.add(itemId)
                        } else {
                            listComponent._data.selectedItems.delete(itemId)
                        }
                        
                        // 更新全选状态
                        listComponent._data.allSelected = listComponent._data.selectedItems.size === listComponent._data.list.length
                    }
                    
                    // 更新UI
                    listComponent._elements.updateSelectionUI()
                    
                    // 触发回调
                    listComponent._elements.triggerSelectionChange()
                })
            },
        },
        setEmptyMessage: (message) => {
            listComponent._data.emptyMessage = message
            if (listComponent._data.list.length === 0 && !listComponent._data.loading) {
                listComponent._elements.renderList()
            }
        },
        refresh: (newQueryParams = {}) => {
            // 每次都动态获取queryParams，并合并运行时参数和临时参数
            const baseQueryParams = getQueryParams(listComponent._config.queryParams);
            const mergedQueryParams = { ...baseQueryParams, ...listComponent._runtimeQueryParams, ...newQueryParams };

            listComponent._elements.setLoading(true)
            const requestParams = {
                ...mergedQueryParams,
                pager: {
                    "page": listComponent._data.currentPage,
                    "size": listComponent._data.pageSize
                }
            }


            return API.post({
                url: listComponent._data.apiUrl,
                data: requestParams
            }).then((res) => {
                if (res.success) {
                    listComponent._data.list = res.data.records || []
                    listComponent._data.total = res.data.total || 0
                    listComponent._elements.renderList()
                    listComponent._elements.renderPageInfo()
                    listComponent._elements.renderPagination()
                    if (onSuccess) {
                        onSuccess(res, listComponent._data)
                    }
                } else {
                    if (onError) {
                        onError(res.message || '查询失败', res)
                    } else {
                        UI.showToast('danger', res.message || '查询失败')
                    }
                }
            }).catch((error) => {
                console.error('列表查询失败:', error)
                const colspan = listComponent._elements.getTableColumnCount()
                listComponent._elements.getTableBody().html(`
                    <tr class="table-empty-row">
                        <td colspan="${colspan}" class="text-center">
                            <div class="d-flex align-items-center justify-content-center h-100">
                                <div class="text-danger">
                                    <i class="fas fa-exclamation-triangle fa-2x mb-2"></i><br>
                                    数据加载失败
                                </div>
                            </div>
                        </td>
                    </tr>
                `)
                if (onError) {
                    onError(error.message || '网络请求失败', error)
                } else {
                    UI.showToast('danger', '数据加载失败')
                }
            }).finally(() => {
                listComponent._elements.setLoading(false)
            })
        },
        goToPage: (page) => {
            listComponent._data.currentPage = page
            listComponent.refresh()
        },
        updateQuery: (newParams) => {
            listComponent._data.currentPage = 1
            listComponent._runtimeQueryParams = { ...listComponent._runtimeQueryParams, ...newParams }
            listComponent.refresh()
        },

        // 🔧 新增：重置到第一页并刷新
        resetToFirstPage: () => {
            listComponent._data.currentPage = 1
            return listComponent.refresh()
        },

        // 🔧 新增：重置到第一页并更新查询参数
        resetToFirstPageWithQuery: (newParams) => {
            listComponent._data.currentPage = 1
            listComponent._runtimeQueryParams = { ...listComponent._runtimeQueryParams, ...newParams }
            return listComponent.refresh()
        },
        getData: () => {
            return {
                list: listComponent._data.list,
                total: listComponent._data.total,
                currentPage: listComponent._data.currentPage,
                pageSize: listComponent._data.pageSize,
                queryParams: listComponent._config.queryParams,
                runtimeQueryParams: listComponent._runtimeQueryParams
            }
        },

        // 🔧 新增：获取选中项的ID数组
        getSelectedIds: () => {
            if (!listComponent._selection?.enabled) return []
            return Array.from(listComponent._data.selectedItems)
        },

        // 🔧 新增：获取选中项的完整数据
        getSelectedItems: () => {
            if (!listComponent._selection?.enabled) return []
            return listComponent._data.list.filter(item => 
                listComponent._data.selectedItems.has(item[listComponent._selection.idField]))
        },

        // 🔧 新增：设置选中项（通过ID数组）
        setSelectedIds: (ids) => {
            if (!listComponent._selection?.enabled) return

            listComponent._data.selectedItems.clear()
            ids.forEach(id => {
                // 检查ID是否存在于当前列表中
                if (listComponent._data.list.some(item => item[listComponent._selection.idField] === id)) {
                    listComponent._data.selectedItems.add(id)
                }
            })

            // 更新全选状态
            listComponent._data.allSelected = listComponent._data.selectedItems.size === listComponent._data.list.length

            // 更新UI
            listComponent._elements.updateSelectionUI()
            
            // 触发回调
            listComponent._elements.triggerSelectionChange()
        },

        // 🔧 新增：清空选择
        clearSelection: () => {
            if (!listComponent._selection?.enabled) return

            listComponent._data.selectedItems.clear()
            listComponent._data.allSelected = false

            // 更新UI
            listComponent._elements.updateSelectionUI()
            
            // 触发回调
            listComponent._elements.triggerSelectionChange()
        },

        // 🔧 新增：全选当前页
        selectAll: () => {
            if (!listComponent._selection?.enabled) return

            listComponent._data.selectedItems.clear()
            listComponent._data.list.forEach(item => {
                const itemId = item[listComponent._selection.idField]
                listComponent._data.selectedItems.add(itemId)
            })
            listComponent._data.allSelected = true

            // 更新UI
            listComponent._elements.updateSelectionUI()
            
            // 触发回调
            listComponent._elements.triggerSelectionChange()
        },

        // 🔧 新增：获取选择状态信息
        getSelectionInfo: () => {
            if (!listComponent._selection?.enabled) {
                return {
                    enabled: false,
                    selectedCount: 0,
                    totalCount: 0,
                    allSelected: false
                }
            }

            return {
                enabled: true,
                selectedCount: listComponent._data.selectedItems.size,
                totalCount: listComponent._data.list.length,
                allSelected: listComponent._data.allSelected,
                mode: listComponent._selection.mode,
                selectedIds: Array.from(listComponent._data.selectedItems)
            }
        },
        
        init: () => {
            listComponent._elements.bindPaginationEvents()
            listComponent._elements.bindQueryEvents()
            listComponent._elements.bindSelectionEvents()
            
            // 🔧 新增：注册到全局选择管理器
            if (listComponent._selection?.enabled) {
                ListSelectionManager.registerInstance(containerId, listComponent)
            }
            
            listComponent.refresh()
            return listComponent
        },
        destroy: () => {
            // listComponent._elements.getPagination().off('click', '.page-link')
            // listComponent._elements.getContainer().find('[data-list-query]').off('change.ajaxList')
            // listComponent._elements.getContainer().find('[data-list-query-btn]').off('click.ajaxList')
            
            // // 🔧 新增：从全局选择管理器注销
            // if (listComponent._selection?.enabled) {
            //     ListSelectionManager.unregisterInstance(containerId)
            // }
            
            // console.log(`无刷新列表组件 ${containerId} 已销毁`)

            const container = listComponent._elements.getContainer()
                
            // 解绑分页事件
            listComponent._elements.getPagination().off('click', '.page-link')
            
            // 解绑查询事件
            container.find('[data-list-query]').off('change.ajaxList')
            container.find('[data-list-query-btn]').off('click.ajaxList')
            
            // 🔧 新增：解绑选择事件
            container.off('change', `#selectAll[data-container-id="${containerId}"]`)
            container.off('change', `.list-row-checkbox[data-container-id="${containerId}"], .list-row-radio[data-container-id="${containerId}"]`)
            
            // 🔧 新增：从全局选择管理器注销
            if (listComponent._selection?.enabled) {
                ListSelectionManager.unregisterInstance(containerId)
            }
        }
    }
    return listComponent
}

// 工具函数：获取queryParams的最终值，支持对象和函数
function getQueryParams(queryParams) {
    if (typeof queryParams === 'function') {
        try {
            return queryParams() || {};
        } catch (e) {
            console.error('queryParams函数执行异常:', e);
            return {};
        }
    }
    return queryParams || {};
}

// 🔧 新增：列表组件选择功能的全局事件管理器
const ListSelectionManager = {
    // 存储所有列表组件实例的引用
    _instances: new Map(),
    
    // 注册列表组件实例
    registerInstance: function(containerId, listInstance) {
        this._instances.set(containerId, listInstance);
    },
    
    // 注销列表组件实例
    unregisterInstance: function(containerId) {
        this._instances.delete(containerId);
    },
    
    // 获取列表组件实例
    getInstance: function(containerId) {
        return this._instances.get(containerId);
    },
    
    // 处理全选复选框变化
    handleSelectAllChange: function(containerId) {
        const instance = this.getInstance(containerId);
        if (instance && instance._elements && instance._elements.toggleSelectAll) {
            instance._elements.toggleSelectAll();
        }
    },
    
    // 处理行选择变化
    handleRowSelectionChange: function(containerId, itemId) {
        const instance = this.getInstance(containerId);
        if (instance && instance._elements && instance._elements.toggleRowSelection) {
            instance._elements.toggleRowSelection(itemId);
        }
    }
};

// ==================== CardListComponentFactory ====================
/**
 * CardListComponentFactory: 基于Card布局的列表组件工厂
 * 支持灵活的Card布局，基于metis-list-item的选择功能
 */
const CardListComponentFactory = {
    /**
     * 创建页面刷新型Card列表组件
     * @param {Object} config 配置对象
     * @param {string} config.containerId - 列表容器ID
     * @param {string} config.apiUrl - API请求地址
     * @param {Object} config.queryParams - 查询参数
     * @param {Function} config.renderCard - Card渲染函数
     * @param {Function} config.onSuccess - 成功回调
     * @param {Function} config.onError - 错误回调
     * @param {Object} config.pagination - 分页配置
     * @param {Object} config.selection - 选择功能配置
     */
    createRefreshCardList(config) {
        const {
            containerId,
            apiUrl,
            queryParams = {},
            renderCard,
            onSuccess,
            onError,
            pagination = {},
            emptyMessage = null,
            selection = null
        } = config

        // 默认分页配置
        const defaultPagination = {
            pageParamName: 'page',
            pageSizeParamName: 'size',
            defaultPageSize: 12, // Card布局默认每页12个
            showPageInfo: true,
            pageInfoSelector: null,
            paginationSelector: null,
            maxVisiblePages: 10, // 🔧 新增：默认显示10页
            showFirstLast: true // 🔧 新增：始终显示第一页和最后一页
        }
        
        const finalPagination = { ...defaultPagination, ...pagination }
        
        // 基于containerId生成选择器
        if (!finalPagination.pageInfoSelector) {
            finalPagination.pageInfoSelector = `#${containerId}Info`
        }
        if (!finalPagination.paginationSelector) {
            finalPagination.paginationSelector = `#${containerId}Pagination`
        }

        // 默认空数据提示
        const defaultEmptyMessage = `
            <div class="text-muted text-center py-5">
                <i class="fas fa-inbox fa-3x mb-3"></i><br>
                暂无数据
            </div>
        `

        // 选择功能默认配置
        const defaultSelection = {
            enabled: false,
            mode: 'multiple', // single 或 multiple
            idField: 'id',
            selectedClass: 'metis-list-item-selected', // 🔧 新增：选中状态的CSS类名
            onSelectionChange: null
        }
        const finalSelection = selection ? { ...defaultSelection, ...selection } : null

        const cardListComponent = {
            _data: {
                containerId: containerId,
                apiUrl: apiUrl,
                loading: false,
                list: [],
                total: 0,
                currentPage: 1,
                pageSize: finalPagination.defaultPageSize,
                emptyMessage: emptyMessage || defaultEmptyMessage,
                selectedItems: new Set(),
                allSelected: false
            },

            _config: {
                queryParams: queryParams
            },

            _pagination: finalPagination,
            _selection: finalSelection,

            _elements: {
                // 获取列表容器
                getContainer: () => {
                    return $(`#${cardListComponent._data.containerId}`)
                },

                // 获取Card容器（metis-list-body）
                getCardContainer: () => {
                    return $(`#${cardListComponent._data.containerId}`).find("[metis-list-body]")
                },

                // 获取分页信息
                getPageInfo: () => {
                    return $(`#${cardListComponent._data.containerId}`).find("[metis-list-info]")
                },

                // 获取分页控件
                getPagination: () => {
                    return $(`#${cardListComponent._data.containerId}`).find("[metis-list-pagination]")
                },

                // 设置加载状态
                setLoading: (isLoading) => {
                    cardListComponent._data.loading = isLoading
                    const cardContainer = cardListComponent._elements.getCardContainer()
                    
                    if (isLoading) {
                        cardContainer.html(`
                            <div class="col-12">
                                <div class="text-center py-5">
                                    <div class="spinner-border" role="status">
                                        <span class="visually-hidden">加载中...</span>
                                    </div>
                                    <div class="mt-2">加载中...</div>
                                </div>
                            </div>
                        `)
                    }
                },

                // 渲染Card列表
                renderCards: () => {
                    const cardContainer = cardListComponent._elements.getCardContainer()
                    
                    if (cardListComponent._data.list.length === 0) {
                        cardContainer.html(`
                            <div class="col-12">
                                ${cardListComponent._data.emptyMessage}
                            </div>
                        `)
                    } else {
                        cardContainer.empty()
                        cardListComponent._data.list.forEach((item, index) => {
                            if (renderCard) {
                                const itemId = item[cardListComponent._selection?.idField || 'id']
                                let cardHtml = renderCard(item, index, cardListComponent._data)
                                
                                // 如果启用了选择功能，添加选择相关的class和data属性
                                if (cardListComponent._selection?.enabled) {
                                    const isSelected = cardListComponent._data.selectedItems.has(itemId)
                                    const selectedClass = cardListComponent._selection.selectedClass || 'metis-list-item-selected'
                                    const selectionClass = isSelected ? `metis-list-item ${selectedClass}` : 'metis-list-item'
                                    const selectionData = `data-item-id="${itemId}" data-container-id="${cardListComponent._data.containerId}"`
                                    
                                    // 在cardHtml中添加选择相关的class和data属性
                                    cardHtml = cardHtml.replace(/class="([^"]*)"/, `class="$1 ${selectionClass}" ${selectionData}`)
                                }
                                
                                cardContainer.append(cardHtml)
                            }
                        })
                        
                        // 渲染完成后更新选择状态
                        if (cardListComponent._selection?.enabled) {
                            cardListComponent._elements.updateSelectionUI()
                        }
                    }
                },

                // 更新选择相关的UI状态
                updateSelectionUI: () => {
                    if (!cardListComponent._selection?.enabled) return

                    const cardContainer = cardListComponent._elements.getCardContainer()
                    const selectedClass = cardListComponent._selection.selectedClass || 'metis-list-item-selected'
                    
                    cardContainer.find('.metis-list-item').each(function() {
                        const $card = $(this)
                        const itemId = $card.data('item-id')
                        const isSelected = cardListComponent._data.selectedItems.has(itemId)
                        
                        if (isSelected) {
                            $card.addClass(selectedClass)
                        } else {
                            $card.removeClass(selectedClass)
                        }
                    })
                },

                // 处理Card选择
                toggleCardSelection: (itemId) => {
                    if (!cardListComponent._selection?.enabled) return

                    if (cardListComponent._selection.mode === 'single') {
                        // 单选模式：清除其他选择
                        cardListComponent._data.selectedItems.clear()
                        cardListComponent._data.selectedItems.add(itemId)
                        cardListComponent._data.allSelected = false
                    } else {
                        // 多选模式：切换当前项
                        if (cardListComponent._data.selectedItems.has(itemId)) {
                            cardListComponent._data.selectedItems.delete(itemId)
                        } else {
                            cardListComponent._data.selectedItems.add(itemId)
                        }
                        
                        // 更新全选状态
                        cardListComponent._data.allSelected = cardListComponent._data.selectedItems.size === cardListComponent._data.list.length
                    }

                    // 更新UI状态
                    cardListComponent._elements.updateSelectionUI()
                    
                    // 触发选择变化回调
                    cardListComponent._elements.triggerSelectionChange()
                },

                // 触发选择变化回调
                triggerSelectionChange: () => {
                    if (cardListComponent._selection?.onSelectionChange) {
                        const selectedIds = Array.from(cardListComponent._data.selectedItems)
                        const selectedItems = cardListComponent._data.list.filter(item => 
                            cardListComponent._data.selectedItems.has(item[cardListComponent._selection.idField]))
                        
                        cardListComponent._selection.onSelectionChange(selectedIds, selectedItems)
                    }
                },

                // 渲染分页信息
                renderPageInfo: () => {
                    if (!cardListComponent._pagination.showPageInfo) return

                    const pageInfo = cardListComponent._elements.getPageInfo()
                    if (pageInfo.length === 0) return

                    if (cardListComponent._data.total === 0) {
                        pageInfo.text('共 0 条记录')
                        return
                    }

                    const startRecord = (cardListComponent._data.currentPage - 1) * cardListComponent._data.pageSize + 1
                    const endRecord = Math.min(cardListComponent._data.currentPage * cardListComponent._data.pageSize, cardListComponent._data.total)
                    
                    pageInfo.text(`显示 ${startRecord}-${endRecord} 条，共 ${cardListComponent._data.total} 条记录`)
                },

                // 渲染分页控件
                renderPagination: () => {
                    const pagination = cardListComponent._elements.getPagination()
                    if (pagination.length === 0) return

                    const totalPages = Math.ceil(cardListComponent._data.total / cardListComponent._data.pageSize)
                    const currentPage = cardListComponent._data.currentPage

                    if (totalPages <= 1) {
                        if (cardListComponent._data.total === 0) {
                            pagination.empty()
                        } else {
                            pagination.html(`
                                <li class="page-item active">
                                    <span class="page-link">1</span>
                                </li>
                            `)
                        }
                        return
                    }

                    let paginationHtml = ''

                    // 上一页
                    const prevDisabled = currentPage <= 1 ? 'disabled' : ''
                    paginationHtml += `
                        <li class="page-item ${prevDisabled}">
                            <a class="page-link" href="#" data-page="${currentPage - 1}" ${prevDisabled ? 'tabindex="-1"' : ''}>上一页</a>
                        </li>
                    `

                    // 🔧 改进：智能分页显示逻辑
                    const maxVisible = listComponent._pagination.maxVisiblePages || 10
                    const showFirstLast = listComponent._pagination.showFirstLast !== false
                    
                    let startPage, endPage
                    
                    if (totalPages <= maxVisible) {
                        // 总页数不超过最大显示数，显示所有页
                        startPage = 1
                        endPage = totalPages
                    } else {
                        // 总页数超过最大显示数，智能计算显示范围
                        const halfVisible = Math.floor(maxVisible / 2)
                        
                        if (currentPage <= halfVisible) {
                            // 当前页靠前，显示前几页
                            startPage = 1
                            endPage = maxVisible
                        } else if (currentPage >= totalPages - halfVisible) {
                            // 当前页靠后，显示后几页
                            startPage = totalPages - maxVisible + 1
                            endPage = totalPages
                        } else {
                            // 当前页在中间，以当前页为中心显示
                            startPage = currentPage - halfVisible
                            endPage = currentPage + halfVisible
                        }
                    }

                    // 显示第一页（如果不在范围内且启用）
                    if (showFirstLast && startPage > 1) {
                        paginationHtml += `
                            <li class="page-item">
                                <a class="page-link" href="#" data-page="1">1</a>
                            </li>
                        `
                        if (startPage > 2) {
                            paginationHtml += `
                                <li class="page-item disabled">
                                    <span class="page-link">...</span>
                                </li>
                            `
                        }
                    }

                    // 显示页码
                    for (let i = startPage; i <= endPage; i++) {
                        const activeClass = i === currentPage ? 'active' : ''
                        paginationHtml += `
                            <li class="page-item ${activeClass}">
                                <a class="page-link" href="#" data-page="${i}">${i}</a>
                            </li>
                        `
                    }

                    // 显示最后一页（如果不在范围内且启用）
                    if (showFirstLast && endPage < totalPages) {
                        if (endPage < totalPages - 1) {
                            paginationHtml += `
                                <li class="page-item disabled">
                                    <span class="page-link">...</span>
                                </li>
                            `
                        }
                        paginationHtml += `
                            <li class="page-item">
                                <a class="page-link" href="#" data-page="${totalPages}">${totalPages}</a>
                            </li>
                        `
                    }

                    // 下一页
                    const nextDisabled = currentPage >= totalPages ? 'disabled' : ''
                    paginationHtml += `
                        <li class="page-item ${nextDisabled}">
                            <a class="page-link" href="#" data-page="${currentPage + 1}">下一页</a>
                        </li>
                    `

                    pagination.html(paginationHtml)
                },

                // 绑定分页事件
                bindPaginationEvents: () => {
                    cardListComponent._elements.getPagination().off('click', '.page-link').on('click', '.page-link', function(e) {
                        e.preventDefault()
                        
                        const $this = $(this)
                        if ($this.parent().hasClass('disabled') || $this.parent().hasClass('active')) {
                            return
                        }

                        const targetPage = parseInt($this.data('page'))
                        if (targetPage && targetPage !== cardListComponent._data.currentPage) {
                            // 设置URL参数并刷新页面
                            UTILS.url.setParam(cardListComponent._pagination.pageParamName, targetPage)
                            window.location.reload()
                        }
                    })
                },

                // 🔧 新增：绑定选择事件
                bindSelectionEvents: () => {
                    if (!cardListComponent._selection?.enabled) return
                    
                    const cardContainer = cardListComponent._elements.getCardContainer()
                    cardContainer.off('click', '.metis-list-item').on('click', '.metis-list-item', function(e) {
                        e.preventDefault()
                        e.stopPropagation()
                        
                        const $this = $(this)
                        const itemId = $this.data('item-id')
                        const containerId = $this.data('container-id')
                        
                        
                        if (itemId && containerId === cardListComponent._data.containerId) {
                            cardListComponent._elements.toggleCardSelection(itemId)
                        }
                    })
                },

                // 从URL参数初始化分页
                initFromUrlParams: () => {
                    const pageFromUrl = UTILS.url.getParam(cardListComponent._pagination.pageParamName)
                    if (pageFromUrl) {
                        cardListComponent._data.currentPage = parseInt(pageFromUrl) || 1
                    }

                    const pageSizeFromUrl = UTILS.url.getParam(cardListComponent._pagination.pageSizeParamName)
                    if (pageSizeFromUrl) {
                        cardListComponent._data.pageSize = parseInt(pageSizeFromUrl) || cardListComponent._pagination.defaultPageSize
                    }
                }
            },

            // 公共API方法

            // 更新空数据提示
            setEmptyMessage: (message) => {
                cardListComponent._data.emptyMessage = message
                if (cardListComponent._data.list.length === 0 && !cardListComponent._data.loading) {
                    cardListComponent._elements.renderCards()
                }
            },

            // 刷新列表数据
            refresh: (newQueryParams = {}) => {
                const baseQueryParams = getQueryParams(cardListComponent._config.queryParams);
                const mergedQueryParams = { ...baseQueryParams, ...newQueryParams };

                cardListComponent._elements.setLoading(true)

                const requestParams = {
                    ...mergedQueryParams,
                    pager: {
                        "page": cardListComponent._data.currentPage,
                        "size": cardListComponent._data.pageSize
                    }
                }

                return API.post({
                    url: cardListComponent._data.apiUrl,
                    data: requestParams
                }).then((res) => {
                    if (res.success) {
                        cardListComponent._data.list = res.data.records || []
                        cardListComponent._data.total = res.data.total || 0

                        cardListComponent._elements.renderCards()
                        cardListComponent._elements.renderPageInfo()
                        cardListComponent._elements.renderPagination()

                        if (onSuccess) {
                            onSuccess(res, cardListComponent._data)
                        }
                    } else {
                        if (onError) {
                            onError(res.message || '查询失败', res)
                        } else {
                            UI.showToast('danger', res.message || '查询失败')
                        }
                    }
                }).catch((error) => {
                    console.error('Card列表查询失败:', error)
                    
                    const cardContainer = cardListComponent._elements.getCardContainer()
                    cardContainer.html(`
                        <div class="col-12">
                            <div class="text-danger text-center py-5">
                                <i class="fas fa-exclamation-triangle fa-3x mb-3"></i><br>
                                数据加载失败
                            </div>
                        </div>
                    `)

                    if (onError) {
                        onError(error.message || '网络请求失败', error)
                    } else {
                        UI.showToast('danger', '数据加载失败')
                    }
                }).finally(() => {
                    cardListComponent._elements.setLoading(false)
                })
            },

            // 跳转到指定页
            goToPage: (page) => {
                UTILS.url.setParam(cardListComponent._pagination.pageParamName, page)
                window.location.reload()
            },

            // 更新查询参数并刷新
            updateQuery: (newParams) => {
                UTILS.url.setParam(cardListComponent._pagination.pageParamName, 1)
                
                Object.keys(newParams).forEach(key => {
                    if (newParams[key] !== null && newParams[key] !== undefined && newParams[key] !== '') {
                        UTILS.url.setParam(key, newParams[key])
                    } else {
                        const urlParams = new URLSearchParams(window.location.search)
                        urlParams.delete(key)
                        window.history.pushState({}, '', `${window.location.pathname}?${urlParams.toString()}`)
                    }
                })
                
                window.location.reload()
            },

            // 🔧 新增：重置到第一页并刷新
            resetToFirstPage: () => {
                UTILS.url.setParam(cardListComponent._pagination.pageParamName, 1)
                window.location.reload()
            },

            // 获取当前数据
            getData: () => {
                return {
                    list: cardListComponent._data.list,
                    total: cardListComponent._data.total,
                    currentPage: cardListComponent._data.currentPage,
                    pageSize: cardListComponent._data.pageSize,
                    queryParams: cardListComponent._config.queryParams
                }
            },

            // 获取选中项的ID数组
            getSelectedIds: () => {
                if (!cardListComponent._selection?.enabled) return []
                return Array.from(cardListComponent._data.selectedItems)
            },

            // 获取选中项的完整数据
            getSelectedItems: () => {
                if (!cardListComponent._selection?.enabled) return []
                return cardListComponent._data.list.filter(item => 
                    cardListComponent._data.selectedItems.has(item[cardListComponent._selection.idField]))
            },

            // 设置选中项（通过ID数组）
            setSelectedIds: (ids) => {
                if (!cardListComponent._selection?.enabled) return

                cardListComponent._data.selectedItems.clear()
                ids.forEach(id => {
                    if (cardListComponent._data.list.some(item => item[cardListComponent._selection.idField] === id)) {
                        cardListComponent._data.selectedItems.add(id)
                    }
                })

                cardListComponent._data.allSelected = cardListComponent._data.selectedItems.size === cardListComponent._data.list.length
                cardListComponent._elements.updateSelectionUI()
                cardListComponent._elements.triggerSelectionChange()
            },

            // 清空选择
            clearSelection: () => {
                if (!cardListComponent._selection?.enabled) return

                cardListComponent._data.selectedItems.clear()
                cardListComponent._data.allSelected = false
                cardListComponent._elements.updateSelectionUI()
                cardListComponent._elements.triggerSelectionChange()
            },

            // 全选当前页
            selectAll: () => {
                if (!cardListComponent._selection?.enabled) return

                cardListComponent._data.selectedItems.clear()
                cardListComponent._data.list.forEach(item => {
                    const itemId = item[cardListComponent._selection.idField]
                    cardListComponent._data.selectedItems.add(itemId)
                })
                cardListComponent._data.allSelected = true
                cardListComponent._elements.updateSelectionUI()
                cardListComponent._elements.triggerSelectionChange()
            },

            // 获取选择状态信息
            getSelectionInfo: () => {
                if (!cardListComponent._selection?.enabled) {
                    return {
                        enabled: false,
                        selectedCount: 0,
                        totalCount: 0,
                        allSelected: false
                    }
                }

                return {
                    enabled: true,
                    selectedCount: cardListComponent._data.selectedItems.size,
                    totalCount: cardListComponent._data.list.length,
                    allSelected: cardListComponent._data.allSelected,
                    mode: cardListComponent._selection.mode,
                    selectedIds: Array.from(cardListComponent._data.selectedItems)
                }
            },

            // 初始化Card列表组件
            init: () => {
                cardListComponent._elements.initFromUrlParams()
                cardListComponent._elements.bindPaginationEvents()
                
                // 🔧 新增：绑定选择事件
                cardListComponent._elements.bindSelectionEvents()
                
                cardListComponent.refresh()

                return cardListComponent
            },

            // 销毁Card列表组件
            destroy: () => {
                cardListComponent._elements.getPagination().off('click', '.page-link')
                cardListComponent._elements.getCardContainer().off('click', '.metis-list-item')
                
            }
        }

        return cardListComponent
    },

    /**
     * 创建无刷新型Card列表组件
     * @param {Object} config 配置对象，参数同createRefreshCardList
     */
    createAjaxCardList(config) {
        const {
            containerId,
            apiUrl,
            queryParams = {},
            renderCard,
            onSuccess,
            onError,
            pagination = {},
            emptyMessage = null,
            selection = null
        } = config

        const defaultPagination = {
            pageParamName: 'page',
            pageSizeParamName: 'size',
            defaultPageSize: 12,
            showPageInfo: true,
            pageInfoSelector: null,
            paginationSelector: null,
            maxVisiblePages: 10, // 🔧 新增：默认显示10页
            showFirstLast: true // 🔧 新增：始终显示第一页和最后一页
        }
        const finalPagination = { ...defaultPagination, ...pagination }
        
        if (!finalPagination.pageInfoSelector) {
            finalPagination.pageInfoSelector = `#${containerId}Info`
        }
        if (!finalPagination.paginationSelector) {
            finalPagination.paginationSelector = `#${containerId}Pagination`
        }

        const defaultEmptyMessage = `
            <div class="text-muted text-center py-5">
                <i class="fas fa-inbox fa-3x mb-3"></i><br>
                暂无数据
            </div>
        `
        
        const defaultSelection = {
            enabled: false,
            mode: 'multiple',
            idField: 'id',
            selectedClass: 'metis-list-item-selected', // 🔧 新增：选中状态的CSS类名
            onSelectionChange: null
        }
        const finalSelection = selection ? { ...defaultSelection, ...selection } : null
        
        const cardListComponent = {
            _data: {
                containerId,
                apiUrl,
                loading: false,
                list: [],
                total: 0,
                currentPage: 1,
                pageSize: finalPagination.defaultPageSize,
                emptyMessage: emptyMessage || defaultEmptyMessage,
                selectedItems: new Set(),
                allSelected: false
            },
            _config: {
                queryParams: queryParams
            },
            _runtimeQueryParams: {},
            _pagination: finalPagination,
            _selection: finalSelection,
            _elements: {
                getContainer: () => $(`#${cardListComponent._data.containerId}`),
                getCardContainer: () => $(`#${cardListComponent._data.containerId}`).find("[metis-list-body]"),
                getPageInfo: () => $(`#${cardListComponent._data.containerId}`).find("[metis-list-info]"),
                getPagination: () => $(`#${cardListComponent._data.containerId}`).find("[metis-list-pagination]"),
                
                setLoading: (isLoading) => {
                    cardListComponent._data.loading = isLoading
                    const cardContainer = cardListComponent._elements.getCardContainer()
                    
                    if (isLoading) {
                        cardContainer.html(`
                            <div class="col-12">
                                <div class="text-center py-5">
                                    <div class="spinner-border" role="status">
                                        <span class="visually-hidden">加载中...</span>
                                    </div>
                                    <div class="mt-2">加载中...</div>
                                </div>
                            </div>
                        `)
                    }
                },
                
                renderCards: () => {
                    const cardContainer = cardListComponent._elements.getCardContainer()
                    
                    if (cardListComponent._data.list.length === 0) {
                        cardContainer.html(`
                            <div class="col-12">
                                ${cardListComponent._data.emptyMessage}
                            </div>
                        `)
                    } else {
                        cardContainer.empty()
                        cardListComponent._data.list.forEach((item, index) => {
                            if (renderCard) {
                                const itemId = item[cardListComponent._selection?.idField || 'id']
                                let cardHtml = renderCard(item, index, cardListComponent._data)
                                
                                if (cardListComponent._selection?.enabled) {
                                    const isSelected = cardListComponent._data.selectedItems.has(itemId)
                                    const selectedClass = cardListComponent._selection.selectedClass || 'metis-list-item-selected'
                                    const selectionClass = isSelected ? `metis-list-item ${selectedClass}` : 'metis-list-item'
                                    const selectionData = `data-item-id="${itemId}" data-container-id="${cardListComponent._data.containerId}"`
                                    
                                    cardHtml = cardHtml.replace(/class="([^"]*)"/, `class="$1 ${selectionClass}" ${selectionData}`)
                                }
                                
                                cardContainer.append(cardHtml)
                            }
                        })
                        
                        if (cardListComponent._selection?.enabled) {
                            cardListComponent._elements.updateSelectionUI()
                        }
                    }
                },
                
                updateSelectionUI: () => {
                    if (!cardListComponent._selection?.enabled) return

                    const cardContainer = cardListComponent._elements.getCardContainer()
                    const selectedClass = cardListComponent._selection.selectedClass || 'metis-list-item-selected'
                    
                    cardContainer.find('.metis-list-item').each(function() {
                        const $card = $(this)
                        const itemId = $card.data('item-id')
                        const isSelected = cardListComponent._data.selectedItems.has(itemId)
                        
                        if (isSelected) {
                            $card.addClass(selectedClass)
                        } else {
                            $card.removeClass(selectedClass)
                        }
                    })
                },
                
                toggleCardSelection: (itemId) => {
                    if (!cardListComponent._selection?.enabled) return

                    if (cardListComponent._selection.mode === 'single') {
                        cardListComponent._data.selectedItems.clear()
                        cardListComponent._data.selectedItems.add(itemId)
                        cardListComponent._data.allSelected = false
                    } else {
                        if (cardListComponent._data.selectedItems.has(itemId)) {
                            cardListComponent._data.selectedItems.delete(itemId)
                        } else {
                            cardListComponent._data.selectedItems.add(itemId)
                        }
                        
                        cardListComponent._data.allSelected = cardListComponent._data.selectedItems.size === cardListComponent._data.list.length
                    }

                    cardListComponent._elements.updateSelectionUI()
                    cardListComponent._elements.triggerSelectionChange()
                },
                
                triggerSelectionChange: () => {
                    if (cardListComponent._selection?.onSelectionChange) {
                        const selectedIds = Array.from(cardListComponent._data.selectedItems)
                        const selectedItems = cardListComponent._data.list.filter(item => 
                            cardListComponent._data.selectedItems.has(item[cardListComponent._selection.idField]))
                        
                        cardListComponent._selection.onSelectionChange(selectedIds, selectedItems)
                    }
                },
                
                renderPageInfo: () => {
                    if (!cardListComponent._pagination.showPageInfo) return
                    const pageInfo = cardListComponent._elements.getPageInfo()
                    if (pageInfo.length === 0) return
                    if (cardListComponent._data.total === 0) {
                        pageInfo.text('共 0 条记录')
                        return
                    }
                    const startRecord = (cardListComponent._data.currentPage - 1) * cardListComponent._data.pageSize + 1
                    const endRecord = Math.min(cardListComponent._data.currentPage * cardListComponent._data.pageSize, cardListComponent._data.total)
                    pageInfo.text(`显示 ${startRecord}-${endRecord} 条，共 ${cardListComponent._data.total} 条记录`)
                },
                
                renderPagination: () => {
                    const pagination = cardListComponent._elements.getPagination()
                    if (pagination.length === 0) return
                    const totalPages = Math.ceil(cardListComponent._data.total / cardListComponent._data.pageSize)
                    const currentPage = cardListComponent._data.currentPage
                    if (totalPages <= 1) {
                        if (cardListComponent._data.total === 0) {
                            pagination.empty()
                        } else {
                            pagination.html(`
                                <li class="page-item active">
                                    <span class="page-link">1</span>
                                </li>
                            `)
                        }
                        return
                    }
                    let paginationHtml = ''
                    const prevDisabled = currentPage <= 1 ? 'disabled' : ''
                    paginationHtml += `
                        <li class="page-item ${prevDisabled}">
                            <a class="page-link" href="#" data-page="${currentPage - 1}" ${prevDisabled ? 'tabindex="-1"' : ''}>上一页</a>
                        </li>
                    `
                    // 🔧 改进：智能分页显示逻辑
                    const maxVisible = cardListComponent._pagination.maxVisiblePages || 10
                    const showFirstLast = cardListComponent._pagination.showFirstLast !== false
                    
                    let startPage, endPage
                    
                    if (totalPages <= maxVisible) {
                        // 总页数不超过最大显示数，显示所有页
                        startPage = 1
                        endPage = totalPages
                    } else {
                        // 总页数超过最大显示数，智能计算显示范围
                        const halfVisible = Math.floor(maxVisible / 2)
                        
                        if (currentPage <= halfVisible) {
                            // 当前页靠前，显示前几页
                            startPage = 1
                            endPage = maxVisible
                        } else if (currentPage >= totalPages - halfVisible) {
                            // 当前页靠后，显示后几页
                            startPage = totalPages - maxVisible + 1
                            endPage = totalPages
                        } else {
                            // 当前页在中间，以当前页为中心显示
                            startPage = currentPage - halfVisible
                            endPage = currentPage + halfVisible
                        }
                    }

                    // 显示第一页（如果不在范围内且启用）
                    if (showFirstLast && startPage > 1) {
                        paginationHtml += `
                            <li class="page-item">
                                <a class="page-link" href="#" data-page="1">1</a>
                            </li>
                        `
                        if (startPage > 2) {
                            paginationHtml += `
                                <li class="page-item disabled">
                                    <span class="page-link">...</span>
                                </li>
                            `
                        }
                    }

                    // 显示页码
                    for (let i = startPage; i <= endPage; i++) {
                        const activeClass = i === currentPage ? 'active' : ''
                        paginationHtml += `
                            <li class="page-item ${activeClass}">
                                <a class="page-link" href="#" data-page="${i}">${i}</a>
                            </li>
                        `
                    }

                    // 显示最后一页（如果不在范围内且启用）
                    if (showFirstLast && endPage < totalPages) {
                        if (endPage < totalPages - 1) {
                            paginationHtml += `
                                <li class="page-item disabled">
                                    <span class="page-link">...</span>
                                </li>
                            `
                        }
                        paginationHtml += `
                            <li class="page-item">
                                <a class="page-link" href="#" data-page="${totalPages}">${totalPages}</a>
                            </li>
                        `
                    }
                    const nextDisabled = currentPage >= totalPages ? 'disabled' : ''
                    paginationHtml += `
                        <li class="page-item ${nextDisabled}">
                            <a class="page-link" href="#" data-page="${currentPage + 1}">下一页</a>
                        </li>
                    `
                    pagination.html(paginationHtml)
                    
                    // 重新绑定分页事件
                    cardListComponent._elements.bindPaginationEvents()
                },
                
                bindPaginationEvents: () => {
                    const pagination = cardListComponent._elements.getPagination()
                    pagination.off('click', '.page-link').on('click', '.page-link', function(e) {
                        e.preventDefault()
                        const $this = $(this)
                        if ($this.parent().hasClass('disabled') || $this.parent().hasClass('active')) {
                            return
                        }
                        const targetPage = parseInt($this.data('page'))
                        if (targetPage && targetPage !== cardListComponent._data.currentPage) {
                            cardListComponent.goToPage(targetPage)
                        }
                    })
                },

                // 🔧 新增：绑定选择事件
                bindSelectionEvents: () => {
                    if (!cardListComponent._selection?.enabled) return
                    
                    const cardContainer = cardListComponent._elements.getCardContainer()
                    cardContainer.off('click', '.metis-list-item').on('click', '.metis-list-item', function(e) {
                        e.preventDefault()
                        e.stopPropagation()
                        
                        const $this = $(this)
                        const itemId = $this.data('item-id')
                        const containerId = $this.data('container-id')
                        
                        
                        if (itemId && containerId === cardListComponent._data.containerId) {
                            cardListComponent._elements.toggleCardSelection(itemId)
                        }
                    })
                },
                
                bindQueryEvents: () => {
                    // 监听容器内所有带 data-list-query 的表单元素变化，自动刷新列表
                    cardListComponent._elements.getContainer().find('[data-list-query]').off('change.ajaxCardList').on('change.ajaxCardList', function() {
                        const params = {}
                        cardListComponent._elements.getContainer().find('[data-list-query]').each(function() {
                            const $el = $(this)
                            const name = $el.attr('name')
                            if (name) {
                                params[name] = $el.val()
                            }
                        })
                        cardListComponent.updateQuery(params)
                    })
                    // 监听查询按钮
                    cardListComponent._elements.getContainer().find('[data-list-query-btn]').off('click.ajaxCardList').on('click.ajaxCardList', function() {
                        const params = {}
                        cardListComponent._elements.getContainer().find('[data-list-query]').each(function() {
                            const $el = $(this)
                            const name = $el.attr('name')
                            if (name) {
                                params[name] = $el.val()
                            }
                        })
                        cardListComponent.updateQuery(params)
                    })
                }
            },
            
            setEmptyMessage: (message) => {
                cardListComponent._data.emptyMessage = message
                if (cardListComponent._data.list.length === 0 && !cardListComponent._data.loading) {
                    cardListComponent._elements.renderCards()
                }
            },
            
            refresh: (newQueryParams = {}) => {
                const baseQueryParams = getQueryParams(cardListComponent._config.queryParams);
                const mergedQueryParams = { ...baseQueryParams, ...cardListComponent._runtimeQueryParams, ...newQueryParams };

                cardListComponent._elements.setLoading(true)
                const requestParams = {
                    ...mergedQueryParams,
                    pager: {
                        "page": cardListComponent._data.currentPage,
                        "size": cardListComponent._data.pageSize
                    }
                }

                return API.post({
                    url: cardListComponent._data.apiUrl,
                    data: requestParams
                }).then((res) => {
                    if (res.success) {
                        cardListComponent._data.list = res.data.records || []
                        cardListComponent._data.total = res.data.total || 0
                        cardListComponent._elements.renderCards()
                        cardListComponent._elements.renderPageInfo()
                        cardListComponent._elements.renderPagination()
                        if (onSuccess) {
                            onSuccess(res, cardListComponent._data)
                        }
                    } else {
                        if (onError) {
                            onError(res.message || '查询失败', res)
                        } else {
                            UI.showToast('danger', res.message || '查询失败')
                        }
                    }
                }).catch((error) => {
                    console.error('Card列表查询失败:', error)
                    const cardContainer = cardListComponent._elements.getCardContainer()
                    cardContainer.html(`
                        <div class="col-12">
                            <div class="text-danger text-center py-5">
                                <i class="fas fa-exclamation-triangle fa-3x mb-3"></i><br>
                                数据加载失败
                            </div>
                        </div>
                    `)
                    if (onError) {
                        onError(error.message || '网络请求失败', error)
                    } else {
                        UI.showToast('danger', '数据加载失败')
                    }
                }).finally(() => {
                    cardListComponent._elements.setLoading(false)
                })
            },
            
            goToPage: (page) => {
                cardListComponent._data.currentPage = page
                cardListComponent.refresh()
            },
            
            updateQuery: (newParams) => {
                cardListComponent._data.currentPage = 1
                cardListComponent._runtimeQueryParams = { ...cardListComponent._runtimeQueryParams, ...newParams }
                cardListComponent.refresh()
            },

            // 🔧 新增：重置到第一页并刷新
            resetToFirstPage: () => {
                cardListComponent._data.currentPage = 1
                return cardListComponent.refresh()
            },

            // 🔧 新增：重置到第一页并更新查询参数
            resetToFirstPageWithQuery: (newParams) => {
                cardListComponent._data.currentPage = 1
                cardListComponent._runtimeQueryParams = { ...cardListComponent._runtimeQueryParams, ...newParams }
                return cardListComponent.refresh()
            },
            
            getData: () => {
                return {
                    list: cardListComponent._data.list,
                    total: cardListComponent._data.total,
                    currentPage: cardListComponent._data.currentPage,
                    pageSize: cardListComponent._data.pageSize,
                    queryParams: cardListComponent._config.queryParams,
                    runtimeQueryParams: cardListComponent._runtimeQueryParams
                }
            },
            
            getSelectedIds: () => {
                if (!cardListComponent._selection?.enabled) return []
                return Array.from(cardListComponent._data.selectedItems)
            },
            
            getSelectedItems: () => {
                if (!cardListComponent._selection?.enabled) return []
                return cardListComponent._data.list.filter(item => 
                    cardListComponent._data.selectedItems.has(item[cardListComponent._selection.idField]))
            },
            
            setSelectedIds: (ids) => {
                if (!cardListComponent._selection?.enabled) return

                cardListComponent._data.selectedItems.clear()
                ids.forEach(id => {
                    if (cardListComponent._data.list.some(item => item[cardListComponent._selection.idField] === id)) {
                        cardListComponent._data.selectedItems.add(id)
                    }
                })

                cardListComponent._data.allSelected = cardListComponent._data.selectedItems.size === cardListComponent._data.list.length
                cardListComponent._elements.updateSelectionUI()
                cardListComponent._elements.triggerSelectionChange()
            },
            
            clearSelection: () => {
                if (!cardListComponent._selection?.enabled) return

                cardListComponent._data.selectedItems.clear()
                cardListComponent._data.allSelected = false
                cardListComponent._elements.updateSelectionUI()
                cardListComponent._elements.triggerSelectionChange()
            },
            
            selectAll: () => {
                if (!cardListComponent._selection?.enabled) return

                cardListComponent._data.selectedItems.clear()
                cardListComponent._data.list.forEach(item => {
                    const itemId = item[cardListComponent._selection.idField]
                    cardListComponent._data.selectedItems.add(itemId)
                })
                cardListComponent._data.allSelected = true
                cardListComponent._elements.updateSelectionUI()
                cardListComponent._elements.triggerSelectionChange()
            },
            
            getSelectionInfo: () => {
                if (!cardListComponent._selection?.enabled) {
                    return {
                        enabled: false,
                        selectedCount: 0,
                        totalCount: 0,
                        allSelected: false
                    }
                }

                return {
                    enabled: true,
                    selectedCount: cardListComponent._data.selectedItems.size,
                    totalCount: cardListComponent._data.list.length,
                    allSelected: cardListComponent._data.allSelected,
                    mode: cardListComponent._selection.mode,
                    selectedIds: Array.from(cardListComponent._data.selectedItems)
                }
            },
            
            init: () => {
                cardListComponent._elements.bindPaginationEvents()
                cardListComponent._elements.bindQueryEvents()
                
                // 🔧 新增：绑定选择事件
                cardListComponent._elements.bindSelectionEvents()
                
                cardListComponent.refresh()
                return cardListComponent
            },
            
            destroy: () => {
                cardListComponent._elements.getPagination().off('click', '.page-link')
                cardListComponent._elements.getContainer().find('[data-list-query]').off('change.ajaxCardList')
                cardListComponent._elements.getContainer().find('[data-list-query-btn]').off('click.ajaxCardList')
                cardListComponent._elements.getCardContainer().off('click', '.metis-list-item')
            }
        }
        return cardListComponent
    }
}

// 🔧 新增：Card列表组件选择功能的全局事件管理器
const CardListSelectionManager = {
    _instances: new Map(),
    
    registerInstance: function(containerId, cardListInstance) {
        this._instances.set(containerId, cardListInstance);
    },
    
    unregisterInstance: function(containerId) {
        this._instances.delete(containerId);
    },
    
    getInstance: function(containerId) {
        return this._instances.get(containerId);
    },
    
    handleCardSelectionChange: function(containerId, itemId) {
        const instance = this.getInstance(containerId);
        if (instance && instance._elements && instance._elements.toggleCardSelection) {
            instance._elements.toggleCardSelection(itemId);
        } else {
            console.log('实例或方法不存在');
        }
    }
};

// ==================== StaticCardListComponentFactory ====================
/**
 * StaticCardListComponentFactory: 基于静态数据的Card列表组件工厂
 * 支持客户端分页、选择功能，数据由外部提供和更新
 const staticCardList = StaticCardListComponentFactory.create({
    containerId: 'myStaticCardList',
    data: allData, // 全部数据
    renderCard: (item, index, data) => {
        return `
            <div class="col-md-4 mb-3">
                <div class="card">
                    <img src="${item.image}" class="card-img-top">
                    <div class="card-body">
                        <h5 class="card-title">${item.title}</h5>
                        <p class="card-text">${item.description}</p>
                    </div>
                </div>
            </div>
        `;
    },
    selection: {
        enabled: true,
        mode: 'multiple',
        selectedIds: [1, 3, 5] // 初始选中
    },
    pagination: {
        pageSize: 12 // 每页显示数量
    },
    onSelectionChange: (selectedIds, selectedItems) => {
        console.log('选中项:', selectedIds, selectedItems);
    }
}).init();

// 动态更新数据
staticCardList.setData(newData);

// 设置过滤数据
staticCardList.setFilteredData(filteredData);

// 设置选中项
staticCardList.setSelectedIds([2, 4, 6]);

// 获取选中项
const selectedIds = staticCardList.getSelectedIds();
const selectedItems = staticCardList.getSelectedItems();
 */
const StaticCardListComponentFactory = {
    /**
     * 创建静态Card列表组件
     * @param {Object} config 配置对象
     * @param {string} config.containerId - 列表容器ID
     * @param {Array} config.data - 全部数据
     * @param {Function} config.renderCard - Card渲染函数
     * @param {Object} config.selection - 选择功能配置
     * @param {Object} config.pagination - 分页配置
     * @param {Function} config.onSelectionChange - 选择变化回调
     */
    create(config) {
        const {
            containerId,
            data = [],
            renderCard,
            selection = null,
            pagination = {},
            onSelectionChange = null
        } = config

        // 默认分页配置
        const defaultPagination = {
            pageSize: 12,
            showPageInfo: true,
            pageInfoSelector: null,
            paginationSelector: null
        }
        const finalPagination = { ...defaultPagination, ...pagination }
        
        if (!finalPagination.pageInfoSelector) {
            finalPagination.pageInfoSelector = `#${containerId}Info`
        }
        if (!finalPagination.paginationSelector) {
            finalPagination.paginationSelector = `#${containerId}Pagination`
        }

        // 默认空数据提示
        const defaultEmptyMessage = `
            <div class="text-muted text-center py-5">
                <i class="fas fa-inbox fa-3x mb-3"></i><br>
                暂无数据
            </div>
        `

        // 选择功能默认配置
        const defaultSelection = {
            enabled: false,
            mode: 'multiple',
            idField: 'id',
            selectedClass: 'metis-list-item-selected',
            onSelectionChange: onSelectionChange
        }
        const finalSelection = selection ? { ...defaultSelection, ...selection } : null

        const staticCardListComponent = {
            _data: {
                containerId: containerId,
                allData: [...data], // 全部数据
                filteredData: [...data], // 过滤后的数据
                list: [], // 当前页数据
                total: data.length,
                currentPage: 1,
                pageSize: finalPagination.pageSize,
                emptyMessage: defaultEmptyMessage,
                selectedItems: new Set(),
                allSelected: false
            },

            _config: {
                renderCard: renderCard,
                pagination: finalPagination,
                selection: finalSelection
            },

            _elements: {
                // 获取列表容器
                getContainer: () => {
                    return $(`#${staticCardListComponent._data.containerId}`)
                },

                // 获取Card容器
                getCardContainer: () => {
                    return $(`#${staticCardListComponent._data.containerId}`).find("[metis-list-body]")
                },

                // 获取分页信息
                getPageInfo: () => {
                    return $(`#${staticCardListComponent._data.containerId}`).find("[metis-list-info]")
                },

                // 获取分页控件
                getPagination: () => {
                    return $(`#${staticCardListComponent._data.containerId}`).find("[metis-list-pagination]")
                },

                // 渲染Card列表
                renderCards: () => {
                    const cardContainer = staticCardListComponent._elements.getCardContainer()
                    
                    if (staticCardListComponent._data.list.length === 0) {
                        cardContainer.html(`
                            <div class="col-12">
                                ${staticCardListComponent._data.emptyMessage}
                            </div>
                        `)
                    } else {
                        cardContainer.empty()
                        staticCardListComponent._data.list.forEach((item, index) => {
                            if (staticCardListComponent._config.renderCard) {
                                const itemId = item[staticCardListComponent._config.selection?.idField || 'id']
                                let cardHtml = staticCardListComponent._config.renderCard(item, index, staticCardListComponent._data)
                                
                                if (staticCardListComponent._config.selection?.enabled) {
                                    const isSelected = staticCardListComponent._data.selectedItems.has(itemId)
                                    const selectedClass = staticCardListComponent._config.selection.selectedClass || 'metis-list-item-selected'
                                    const selectionClass = isSelected ? `metis-list-item ${selectedClass}` : 'metis-list-item'
                                    const selectionData = `data-item-id="${itemId}" data-container-id="${staticCardListComponent._data.containerId}"`
                                    
                                    cardHtml = cardHtml.replace(/class="([^"]*)"/, `class="$1 ${selectionClass}" ${selectionData}`)
                                }
                                
                                cardContainer.append(cardHtml)
                            }
                        })
                        
                        if (staticCardListComponent._config.selection?.enabled) {
                            staticCardListComponent._elements.updateSelectionUI()
                        }
                    }
                },

                // 更新选择相关的UI状态
                updateSelectionUI: () => {
                    if (!staticCardListComponent._config.selection?.enabled) return

                    const cardContainer = staticCardListComponent._elements.getCardContainer()
                    const selectedClass = staticCardListComponent._config.selection.selectedClass || 'metis-list-item-selected'
                    
                    cardContainer.find('.metis-list-item').each(function() {
                        const $card = $(this)
                        const itemId = $card.data('item-id')
                        const isSelected = staticCardListComponent._data.selectedItems.has(itemId)
                        
                        if (isSelected) {
                            $card.addClass(selectedClass)
                        } else {
                            $card.removeClass(selectedClass)
                        }
                    })
                },

                // 处理Card选择
                toggleCardSelection: (itemId) => {
                    if (!staticCardListComponent._config.selection?.enabled) {
                        console.log('选择功能未启用');
                        return
                    }

                    if (staticCardListComponent._config.selection.mode === 'single') {
                        staticCardListComponent._data.selectedItems.clear()
                        staticCardListComponent._data.selectedItems.add(itemId)
                        staticCardListComponent._data.allSelected = false
                    } else {
                        if (staticCardListComponent._data.selectedItems.has(itemId)) {
                            staticCardListComponent._data.selectedItems.delete(itemId)
                        } else {
                            staticCardListComponent._data.selectedItems.add(itemId)
                        }
                        
                        staticCardListComponent._data.allSelected = staticCardListComponent._data.selectedItems.size === staticCardListComponent._data.list.length
                    }

                    staticCardListComponent._elements.updateSelectionUI()
                    staticCardListComponent._elements.triggerSelectionChange()
                },

                // 触发选择变化回调
                triggerSelectionChange: () => {
                    if (staticCardListComponent._config.selection?.onSelectionChange) {
                        const selectedIds = Array.from(staticCardListComponent._data.selectedItems)
                        const selectedItems = staticCardListComponent._data.list.filter(item => 
                            staticCardListComponent._data.selectedItems.has(item[staticCardListComponent._config.selection.idField]))
                        
                        staticCardListComponent._config.selection.onSelectionChange(selectedIds, selectedItems)
                    }
                },

                // 渲染分页信息
                renderPageInfo: () => {
                    if (!staticCardListComponent._config.pagination.showPageInfo) return

                    const pageInfo = staticCardListComponent._elements.getPageInfo()
                    if (pageInfo.length === 0) return

                    if (staticCardListComponent._data.total === 0) {
                        pageInfo.text('共 0 条记录')
                        return
                    }

                    const startRecord = (staticCardListComponent._data.currentPage - 1) * staticCardListComponent._data.pageSize + 1
                    const endRecord = Math.min(staticCardListComponent._data.currentPage * staticCardListComponent._data.pageSize, staticCardListComponent._data.total)
                    
                    pageInfo.text(`显示 ${startRecord}-${endRecord} 条，共 ${staticCardListComponent._data.total} 条记录`)
                },

                // 渲染分页控件
                renderPagination: () => {
                    const pagination = staticCardListComponent._elements.getPagination()
                    if (pagination.length === 0) return

                    const totalPages = Math.ceil(staticCardListComponent._data.total / staticCardListComponent._data.pageSize)
                    const currentPage = staticCardListComponent._data.currentPage

                    if (totalPages <= 1) {
                        if (staticCardListComponent._data.total === 0) {
                            pagination.empty()
                        } else {
                            pagination.html(`
                                <li class="page-item active">
                                    <span class="page-link">1</span>
                                </li>
                            `)
                        }
                        return
                    }

                    let paginationHtml = ''

                    // 上一页
                    const prevDisabled = currentPage <= 1 ? 'disabled' : ''
                    paginationHtml += `
                        <li class="page-item ${prevDisabled}">
                            <a class="page-link" href="#" data-page="${currentPage - 1}" ${prevDisabled ? 'tabindex="-1"' : ''}>上一页</a>
                        </li>
                    `

                    // 🔧 改进：智能分页显示逻辑
                    const maxVisible = 10
                    const showFirstLast = true
                    
                    let startPage, endPage
                    
                    if (totalPages <= maxVisible) {
                        startPage = 1
                        endPage = totalPages
                    } else {
                        const halfVisible = Math.floor(maxVisible / 2)
                        
                        if (currentPage <= halfVisible) {
                            startPage = 1
                            endPage = maxVisible
                        } else if (currentPage >= totalPages - halfVisible) {
                            startPage = totalPages - maxVisible + 1
                            endPage = totalPages
                        } else {
                            startPage = currentPage - halfVisible
                            endPage = currentPage + halfVisible
                        }
                    }

                    // 显示第一页
                    if (showFirstLast && startPage > 1) {
                        paginationHtml += `
                            <li class="page-item">
                                <a class="page-link" href="#" data-page="1">1</a>
                            </li>
                        `
                        if (startPage > 2) {
                            paginationHtml += `
                                <li class="page-item disabled">
                                    <span class="page-link">...</span>
                                </li>
                            `
                        }
                    }

                    // 显示页码
                    for (let i = startPage; i <= endPage; i++) {
                        const activeClass = i === currentPage ? 'active' : ''
                        paginationHtml += `
                            <li class="page-item ${activeClass}">
                                <a class="page-link" href="#" data-page="${i}">${i}</a>
                            </li>
                        `
                    }

                    // 显示最后一页
                    if (showFirstLast && endPage < totalPages) {
                        if (endPage < totalPages - 1) {
                            paginationHtml += `
                                <li class="page-item disabled">
                                    <span class="page-link">...</span>
                                </li>
                            `
                        }
                        paginationHtml += `
                            <li class="page-item">
                                <a class="page-link" href="#" data-page="${totalPages}">${totalPages}</a>
                            </li>
                        `
                    }

                    // 下一页
                    const nextDisabled = currentPage >= totalPages ? 'disabled' : ''
                    paginationHtml += `
                        <li class="page-item ${nextDisabled}">
                            <a class="page-link" href="#" data-page="${currentPage + 1}">下一页</a>
                        </li>
                    `

                    pagination.html(paginationHtml)
                },

                // 绑定分页事件
                bindPaginationEvents: () => {
                    staticCardListComponent._elements.getPagination().off('click', '.page-link').on('click', '.page-link', function(e) {
                        e.preventDefault()
                        
                        const $this = $(this)
                        if ($this.parent().hasClass('disabled') || $this.parent().hasClass('active')) {
                            return
                        }

                        const targetPage = parseInt($this.data('page'))
                        if (targetPage && targetPage !== staticCardListComponent._data.currentPage) {
                            staticCardListComponent.goToPage(targetPage)
                        }
                    })
                },

                // 🔧 新增：绑定选择事件
                bindSelectionEvents: () => {
                    if (!staticCardListComponent._config.selection?.enabled) return
                    
                    const cardContainer = staticCardListComponent._elements.getCardContainer()
                    cardContainer.off('click', '.metis-list-item').on('click', '.metis-list-item', function(e) {
                        e.preventDefault()
                        e.stopPropagation()
                        
                        const $this = $(this)
                        const itemId = $this.data('item-id')
                        const containerId = $this.data('container-id')
                        
                        
                        if (itemId && containerId === staticCardListComponent._data.containerId) {
                            staticCardListComponent._elements.toggleCardSelection(itemId)
                        }
                    })
                }
            },

            // 公共API方法

            // 🔧 新增：设置数据
            setData: (newData) => {
                staticCardListComponent._data.allData = [...newData]
                staticCardListComponent._data.filteredData = [...newData]
                staticCardListComponent._data.total = newData.length
                staticCardListComponent._data.currentPage = 1
                
                // 更新当前页数据
                staticCardListComponent._updateCurrentPageData()
                
                // 重新渲染
                staticCardListComponent._elements.renderCards()
                staticCardListComponent._elements.renderPageInfo()
                staticCardListComponent._elements.renderPagination()
            },

            // 🔧 新增：设置过滤数据
            setFilteredData: (filteredData) => {
                staticCardListComponent._data.filteredData = [...filteredData]
                staticCardListComponent._data.total = filteredData.length
                staticCardListComponent._data.currentPage = 1
                
                // 更新当前页数据
                staticCardListComponent._updateCurrentPageData()
                
                // 重新渲染
                staticCardListComponent._elements.renderCards()
                staticCardListComponent._elements.renderPageInfo()
                staticCardListComponent._elements.renderPagination()
            },

            // 🔧 新增：设置每页显示数量
            setPageSize: (newPageSize) => {
                staticCardListComponent._data.pageSize = newPageSize
                staticCardListComponent._data.currentPage = 1
                
                // 更新当前页数据
                staticCardListComponent._updateCurrentPageData()
                
                // 重新渲染
                staticCardListComponent._elements.renderCards()
                staticCardListComponent._elements.renderPageInfo()
                staticCardListComponent._elements.renderPagination()
            },

            // 私有方法：更新当前页数据
            _updateCurrentPageData: () => {
                const startIndex = (staticCardListComponent._data.currentPage - 1) * staticCardListComponent._data.pageSize
                const endIndex = startIndex + staticCardListComponent._data.pageSize
                staticCardListComponent._data.list = staticCardListComponent._data.filteredData.slice(startIndex, endIndex)
            },

            // 跳转到指定页
            goToPage: (page) => {
                staticCardListComponent._data.currentPage = page
                staticCardListComponent._updateCurrentPageData()
                staticCardListComponent._elements.renderCards()
                staticCardListComponent._elements.renderPageInfo()
                staticCardListComponent._elements.renderPagination()
            },

            // 获取当前数据
            getData: () => {
                return {
                    allData: staticCardListComponent._data.allData,
                    filteredData: staticCardListComponent._data.filteredData,
                    list: staticCardListComponent._data.list,
                    total: staticCardListComponent._data.total,
                    currentPage: staticCardListComponent._data.currentPage,
                    pageSize: staticCardListComponent._data.pageSize
                }
            },

            // 获取选中项的ID数组
            getSelectedIds: () => {
                if (!staticCardListComponent._config.selection?.enabled) return []
                return Array.from(staticCardListComponent._data.selectedItems)
            },

            // 获取选中项的完整数据
            getSelectedItems: () => {
                if (!staticCardListComponent._config.selection?.enabled) return []
                return staticCardListComponent._data.list.filter(item => 
                    staticCardListComponent._data.selectedItems.has(item[staticCardListComponent._config.selection.idField]))
            },

            // 🔧 新增：设置选中项（通过ID数组）
            setSelectedIds: (ids) => {
                if (!staticCardListComponent._config.selection?.enabled) return

                staticCardListComponent._data.selectedItems.clear()
                ids.forEach(id => {
                    // 检查ID是否存在于当前过滤数据中
                    if (staticCardListComponent._data.filteredData.some(item => item[staticCardListComponent._config.selection.idField] === id)) {
                        staticCardListComponent._data.selectedItems.add(id)
                    }
                })

                staticCardListComponent._data.allSelected = staticCardListComponent._data.selectedItems.size === staticCardListComponent._data.list.length
                staticCardListComponent._elements.updateSelectionUI()
                staticCardListComponent._elements.triggerSelectionChange()
            },

            // 清空选择
            clearSelection: () => {
                if (!staticCardListComponent._config.selection?.enabled) return

                staticCardListComponent._data.selectedItems.clear()
                staticCardListComponent._data.allSelected = false
                staticCardListComponent._elements.updateSelectionUI()
                staticCardListComponent._elements.triggerSelectionChange()
            },

            // 全选当前页
            selectAll: () => {
                if (!staticCardListComponent._config.selection?.enabled) return

                staticCardListComponent._data.selectedItems.clear()
                staticCardListComponent._data.list.forEach(item => {
                    const itemId = item[staticCardListComponent._config.selection.idField]
                    staticCardListComponent._data.selectedItems.add(itemId)
                })
                staticCardListComponent._data.allSelected = true
                staticCardListComponent._elements.updateSelectionUI()
                staticCardListComponent._elements.triggerSelectionChange()
            },

            // 获取选择状态信息
            getSelectionInfo: () => {
                if (!staticCardListComponent._config.selection?.enabled) {
                    return {
                        enabled: false,
                        selectedCount: 0,
                        totalCount: 0,
                        allSelected: false
                    }
                }

                return {
                    enabled: true,
                    selectedCount: staticCardListComponent._data.selectedItems.size,
                    totalCount: staticCardListComponent._data.list.length,
                    allSelected: staticCardListComponent._data.allSelected,
                    mode: staticCardListComponent._config.selection.mode,
                    selectedIds: Array.from(staticCardListComponent._data.selectedItems)
                }
            },

            // 初始化静态Card列表组件
            init: () => {
                // 设置初始选中项
                if (staticCardListComponent._config.selection?.enabled && staticCardListComponent._config.selection.selectedIds) {
                    staticCardListComponent.setSelectedIds(staticCardListComponent._config.selection.selectedIds)
                }

                // 更新当前页数据
                staticCardListComponent._updateCurrentPageData()
                
                // 绑定分页事件
                staticCardListComponent._elements.bindPaginationEvents()
                
                // 🔧 新增：绑定选择事件
                staticCardListComponent._elements.bindSelectionEvents()
                
                // 初始渲染
                staticCardListComponent._elements.renderCards()
                staticCardListComponent._elements.renderPageInfo()
                staticCardListComponent._elements.renderPagination()

                return staticCardListComponent
            },

            // 销毁静态Card列表组件
            destroy: () => {
                staticCardListComponent._elements.getPagination().off('click', '.page-link')
                staticCardListComponent._elements.getCardContainer().off('click', '.metis-list-item')
            }
        }

        return staticCardListComponent
    }
}

// 🔧 新增：绑定全局选择事件监听器
// $(document).ready(function() {
//     // 监听全选复选框变化
//     $(document).on('change', '#selectAll[data-container-id]', function() {
//         const containerId = $(this).data('container-id');
//         ListSelectionManager.handleSelectAllChange(containerId);
//     });
    
//     // 监听行复选框变化
//     $(document).on('change', '.list-row-checkbox[data-container-id]', function() {
//         const containerId = $(this).data('container-id');
//         const itemId = $(this).data('item-id');
//         ListSelectionManager.handleRowSelectionChange(containerId, itemId);
//     });
    
//     // 监听行单选框变化
//     $(document).on('change', '.list-row-radio[data-container-id]', function() {
//         const containerId = $(this).data('container-id');
//         const itemId = $(this).data('item-id');
//         ListSelectionManager.handleRowSelectionChange(containerId, itemId);
//     });

// });

// const $PromptTagGroup = [
//     {"key":"STYLE", "name":"风格", "subGroup":[{"key":"MAIN", "name":"其它"},{"key":"TEMP", "name":"临时"}]},
//     {"key":"POV", "name":"视角", "subGroup":[{"key":"MAIN", "name":"其它"},{"key":"TEMP", "name":"临时"}]},
//     {"key":"SHOT", "name":"镜头", "subGroup":[{"key":"MAIN", "name":"其它"},{"key":"TEMP", "name":"临时"}]},
//     {"key":"BODY", "name":"人物整体", "subGroup":[
//         {"key":"人数", "name":"人数"},
//         {"key":"身体", "name":"身体"},
//         {"key":"服饰", "name":"服饰"},
//         {"key":"姿势", "name":"姿势"},
//         {"key":"动作", "name":"动作"},
//         {"key":"MAIN", "name":"其它"},
//         {"key":"TEMP", "name":"临时"}
//     ]},
//     {"key":"HEAD", "name":"头部", "subGroup":[
//         {"key":"头部", "name":"头部"},
//         {"key":"表情", "name":"表情"},
//         {"key":"头发", "name":"头发"},
//         {"key":"眼睛", "name":"眼睛"},
//         {"key":"耳朵", "name":"耳朵"},
//         {"key":"嘴巴", "name":"嘴巴"},
//         {"key":"服饰", "name":"服饰"},
//         {"key":"姿势", "name":"姿势"},
//         {"key":"动作", "name":"动作"},
//         {"key":"MAIN", "name":"其它"},
//         {"key":"TEMP", "name":"临时"}
//     ]},
//     {"key":"UPPERBODY", "name":"上半身", "subGroup":[   
//         {"key":"上半身", "name":"上半身"},
//         {"key":"姿势", "name":"姿势"},
//         {"key":"服饰", "name":"服饰"},
//         {"key":"手部", "name":"手部"},
//         {"key":"胸部", "name":"胸部"},
//         {"key":"动作", "name":"动作"},
//         {"key":"MAIN", "name":"其它"},
//         {"key":"TEMP", "name":"临时"}
//     ]},
//     {"key":"LEGS", "name":"下半身", "subGroup":[
//         {"key":"腿部", "name":"腿部"},
//         {"key":"臀部", "name":"臀部"},
//         {"key":"足部", "name":"足部"},
//         {"key":"服饰", "name":"服饰"},
//         {"key":"姿势", "name":"姿势"},
//         {"key":"动作", "name":"动作"},
//         {"key":"MAIN", "name":"其它"},
//         {"key":"TEMP", "name":"临时"}
//     ]},
//     {"key":"ENV", "name":"环境", "subGroup":[
//         {"key":"环境", "name":"环境"},
//         {"key":"背景", "name":"背景"},
//         {"key":"场景", "name":"场景"},
//         {"key":"道具", "name":"道具"},
//         {"key":"MAIN", "name":"其它"},
//         {"key":"TEMP", "name":"临时"}
//     ]},
//     {"key":"NSFW-POSE", "name":"NSFW姿势", "subGroup":[
//         {"key":"TEMP", "name":"临时"},
//         {"key":"多P", "name":"多P"},
//         {"key":"口交", "name":"口交"},
//         {"key":"乳交", "name":"乳交"},
//         {"key":"手交", "name":"手交"},
//         {"key":"后入式", "name":"后入式"},
//         {"key":"骑乘位", "name":"骑乘位"},
//         {"key":"站立式", "name":"站立式"},
//         {"key":"MAIN", "name":"其它"},
//     ]},
//     {"key":"NSFW-ACTION", "name":"NSFW动作", "subGroup":[
//         {"key":"TEMP", "name":"临时"},
//         {"key":"嘴", "name":"嘴"},
//         {"key":"手", "name":"手"},
//         {"key":"腿", "name":"腿"},
//         {"key":"身体", "name":"身体"},
//         {"key":"暗示", "name":"暗示"},
//         {"key":"引导", "name":"引导"},
//         {"key":"MAIN", "name":"其它"},
//     ]},
//     {"key":"NSFW-GIRL", "name":"NSFW女性", "subGroup":[
//         {"key":"TEMP", "name":"临时"},
//         {"key":"衣物", "name":"衣物"},
//         {"key":"乳房", "name":"乳房"},
//         {"key":"阴部", "name":"阴部"},
//         {"key":"MAIN", "name":"其它"},
//     ]},
//     {"key":"NSFW-MAN", "name":"NSFW男性", "subGroup":[
//         {"key":"TEMP", "name":"临时"},
//         {"key":"阴茎", "name":"阴茎"},
//         {"key":"射精", "name":"射精"},
//         {"key":"阴部", "name":"阴部"},
//         {"key":"MAIN", "name":"其它"},
//     ]},
//     {"key":"TEMP", "name":"未分组", "subGroup":[{"key":"TEMP", "name":"临时"}]},
// ]


const $PromptTagGroup = [
    {"key":"人物", "name":"人物", "subGroup":[
        {"key":"上半身", "name":"上半身"},
        {"key":"上装", "name":"上装"},
        {"key":"下装", "name":"下装"},
        {"key":"体形", "name":"体形"},
        {"key":"其他服装", "name":"其他服装"},
        {"key":"动漫", "name":"动漫"},
        {"key":"发型，其他", "name":"发型，其他"},

        {"key":"发型，其他", "name":"发型，其他"},
        {"key":"发型，前发", "name":"发型，前发"},
        {"key":"发型，双马尾", "name":"发型，双马尾"},
        {"key":"发型，种类", "name":"发型，种类"},
        {"key":"发型，长度", "name":"发型，长度"},
        {"key":"发型，马尾", "name":"发型，马尾"},
        {"key":"发色，单色", "name":"发色，单色"},

        {"key":"发色，多色", "name":"发色，多色"},
        {"key":"发饰", "name":"发饰"},
        {"key":"唐风，披帛，霞帔", "name":"唐风，披帛，霞帔"},
        {"key":"唐风，系带", "name":"唐风，系带"},
        {"key":"唐风，长上衫", "name":"唐风，长上衫"},
        {"key":"唐风，齐胸褶裙", "name":"唐风，齐胸褶裙"},
        {"key":"唐风，齐胸襦裙", "name":"唐风，齐胸襦裙"},

        {"key":"嘴巴", "name":"嘴巴"},
        {"key":"姿态", "name":"姿态"},
        {"key":"宋风，宋抹", "name":"宋风，宋抹"},
        {"key":"宋风，百褶裙", "name":"宋风，百褶裙"},
        {"key":"宋风，短衫", "name":"宋风，短衫"},
        {"key":"宋风，装饰", "name":"宋风，装饰"},
        {"key":"宋风，裙子", "name":"宋风，裙子"},

        {"key":"宋风，长衫", "name":"宋风，长衫"},
        {"key":"对象", "name":"对象"},
        {"key":"尾巴", "name":"尾巴"},
        {"key":"帽饰", "name":"帽饰"},
        {"key":"年龄", "name":"年龄"},
        {"key":"手势", "name":"手势"},
        {"key":"数量", "name":"数量"},

        {"key":"整体", "name":"整体"},
        {"key":"明风，上衣", "name":"明风，上衣"},
        {"key":"服装", "name":"服装"},
        {"key":"皮肤性质", "name":"皮肤性质"},
        {"key":"眉毛", "name":"眉毛"},
        {"key":"眼睛", "name":"眼睛"},

        {"key":"翅膀", "name":"翅膀"},
        {"key":"耳朵", "name":"耳朵"},
        {"key":"职业", "name":"职业"},
        {"key":"肤色", "name":"肤色"},
        {"key":"胡子&牙", "name":"胡子&牙"},
        {"key":"胸", "name":"胸"},

        {"key":"表情", "name":"表情"},
        {"key":"袜类", "name":"袜类"},
        {"key":"装饰", "name":"装饰"},
        {"key":"视线", "name":"视线"},
        {"key":"角", "name":"角"},
        {"key":"身体部位", "name":"身体部位"},

        {"key":"鞋类", "name":"鞋类"},
        {"key":"首饰", "name":"首饰"},
        {"key":"装饰", "name":"装饰"}
    ]},
    {"key":"内置分类-禁", "name":"内置分类-禁", "subGroup":[
        {"key":"1画质", "name":"1画质"}
    ]},
    {"key":"画面", "name":"画面", "subGroup":[
        {"key":"1画质", "name":"1画质"},
        {"key":"光照", "name":"光照"},
        {"key":"四季朝暮", "name":"四季朝暮"},
        {"key":"城市建筑", "name":"城市建筑"},
        {"key":"天涯海角", "name":"天涯海角"},
        {"key":"室内场景", "name":"室内场景"},
        {"key":"日月星辰", "name":"日月星辰"},
        {"key":"背景氛围", "name":"背景氛围"},
        {"key":"艺术家风格", "name":"艺术家风格"},
        {"key":"艺术派系", "name":"艺术派系"},
        {"key":"艺术类型", "name":"艺术类型"},

        {"key":"艺术风格", "name":"艺术风格"},
        {"key":"视线", "name":"视线"},
        {"key":"视角", "name":"视角"}
    ]},
    {"key":"", "name":"空白", "subGroup":[

    ]},
]