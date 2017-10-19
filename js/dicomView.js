new Vue({
    el: '#app',
    data: {
        isPc: !(navigator.userAgent.match(/(phone|pad|pod|iPhone|iPod|ios|iPad|Android|Mobile|BlackBerry|IEMobile|MQQBrowser|JUC|Fennec|wOSBrowser|BrowserNG|WebOS|Symbian|Windows Phone)/i)),
        wadouri: 'wadouri:',
        url: './MRHead-8-slices.dcm',
        image: null,
        activeIndex: 0,
        playHandler: null,
        activeTool: '',
        text: '',
        pointText: 'P',
        pNum: 0,
        layout: 0,
        resize: 0,
        resizeHandler: null,
        isShowInfo: false,
        ww: 0,
        wc: 0,
        zoom: 0,
        infoList: [
            {
                title: '患者信息',
                list: [
                    {title: 'Patient Name', key: '00100010', fun: 'string'},
                    {title: 'Patient ID', key: '00100020'},
                    {title: 'Patient BirthDate', key: '00100030'},
                    {title: 'Patient Sex', key: '00100040'},
                    {title: 'Patient Age', key: '00101010'}
                ]
            }, {
                title: '检查信息',
                list: [
                    /*    {title: 'Study InstanceUID', key: '0020000D'}, */
                    {title: 'Study ID', key: '00200010'},
                    {title: 'Study Date', key: '00080020'},
                    {title: 'Study Time', key: '00080030'}
                ]
            },
            {
                title: '序列信息',
                list: [
                    /*              {title: 'Series InstanceUID', key: '0020000E'},*/
                    {title: 'Series Number', key: '00200011'},
                    {title: 'Modality', key: '00080060'},
                    {title: 'Body Part', key: '00180015', fun: 'uint16'},
                    {title: 'Series Date', key: '00080021'},
                    {title: 'Series Time', key: '00080031'}
                ]
            },
            {
                title: 'Instance 信息',
                list: [
                    {title: 'Instance Number', key: '00200013'},
                    {title: 'Content Date', key: '00080023'},
                    {title: 'Content Time', key: '00080033'}
                ]
            },
            {
                title: '图像信息',
                list: [
                    {title: 'Number Of Frames', key: '00280008'},
                    {title: 'Rows', key: '00280010', fun: 'uint16'},
                    {title: 'Columns', key: '00280011', fun: 'uint16'},
                    {title: 'Photometric Interpretation', key: '00280004'},
                    {title: 'Image Type', key: '00080008'},
                    {title: 'Bits Allocated', key: '00280100', fun: 'uint16'},
                    {title: 'Bits Stored', key: '00280101', fun: 'uint16'},
                    {title: 'High Bit', key: '00280102', fun: 'uint16'},
                    {title: 'Pixel Representation', key: '00280103', fun: 'uint16'},
                    {title: 'Rescale Slope', key: '00281053'},
                    {title: 'Rescale Intercept', key: '00281052'},
                    {title: 'Samples PerPixel', key: '00280002', fun: 'uint16'}
                ]
            }
        ],
        info: {
            PatientName: '00100010',
            PatientID: '00100020',
            PatientSex: '00100040',
            PatientAge: '00101010',
            WindowCenter: '00281050',
            WindowWidth: '00281051',
            NumberOfFrames: '00280008'
        },
        layoutArr: {
            0: [[0]], //1*1
            1: [[0, 1]], //1*2
            2: [[0, 1], [0, 1]], //2*2
            3: [[0, 1, 2], [0, 1, 2], [0, 1, 2]] //3*3
        }
    },
    created() {
        this.setToolsConfig()
        window.onresize = () => {
            this.resize++
        }
        if (this.getQueryString('dcmUrl')) {
            this.url = decodeURIComponent(this.getQueryString('dcmUrl'))
        }
    },
    mounted() {
        this.$refs.view.onCornerstoneImageRendered = (e) => {
            let viewport = cornerstone.getViewport(e.target)
            this.ww = Math.round(viewport.voi.windowWidth)
            this.wc = Math.round(viewport.voi.windowCenter)
            this.zoom = viewport.scale.toFixed(2)
        }
        this.loadImage(this.loadUrl)
    },
    computed: {
        dcmInfoStyle() {
            return this.isShowInfo ? {right: 0} : {right: this.isPc ? '-400px' : '-100%'}
        },
        loadUrl() {
            let reg = new RegExp(this.wadouri)
            if (!reg.test(this.url)) {
                return this.wadouri + this.url
            }
            return this.url
        },
        frames() {
            if (this.image) {
                let numFrames = this.image.data.intString('x' + this.info.NumberOfFrames);
                return numFrames || 1
            }
            return 1
        }
    },
    watch: {
        'image': function (val) {
            this.refreshViewImage(val)
        },
        'layout': function () {
            this.showViewList()
        },
        'activeIndex': function () {
            this.showView()
            this.showViewList()
        },
        'resize': function () {
            this.resizeCallback()
        },
    },
    methods: {
        setToolsConfig() {
            cornerstoneWADOImageLoader.configure({
                beforeSend: function (xhr) {
                }
            });

            cornerstoneTools.zoom.setConfiguration({
                minScale: 0.25,
                maxScale: 20.0,
                preventZoomOutsideImage: true,
            });

            cornerstoneTools.arrowAnnotate.setConfiguration({
                getTextCallback: this.getTextCallback,
                drawHandles: false,
                drawHandlesOnHover: true,
                arrowFirst: true
            });

            cornerstoneTools.seedAnnotate.setConfiguration({
                getTextCallback: this.getSeedAnnotateTextCallback,
                drawHandlesOnHover: true,
                currentLetter: 'P',
                currentNumber: 0,
                showCoordinates: true,
                countUp: true
            });

            cornerstoneTools.magnify.setConfiguration({
                magnifySize: 300,
                magnificationLevel: 2
            });

            cornerstoneTools.toolColors.setToolColor("#ffcc33");
            cornerstoneTools.toolColors.setActiveColor("#0099ff");
            cornerstoneTools.toolColors.setFillColor("#0099ff");
        },
        resizeCallback() {
            if (this.resizeHandler) {
                clearTimeout(this.resizeHandler)
                this.resizeHandler = null
            }
            this.resizeHandler = setTimeout(() => {
                cornerstone.disable(this.$refs.view)
                cornerstone.enable(this.$refs.view)
                this.showView()
                this.showViewList()
            }, 100)
        },
        loadImage(url) {
            try {
                cornerstone.loadAndCacheImage(url).then((image) => {
                    this.image = image
                    this.wc = this.image.windowCenter
                    this.ww = this.image.windowWidth
                    this.zoom = this.image.zoom
                    this.$nextTick(() => {
                        cornerstone.enable(this.$refs.view)
                    })
                }, function (err) {
                    console.log(err)
                });
            }
            catch (err) {
                console.log(err)
            }
        },
        refreshViewImage() {
            this.$nextTick(function () {
                this.showView()
                if (this.frames) {
                    this.showMultiView()
                }
            })
        },
        showMultiView() {
            this.$nextTick(() => {
                this.$refs.frames.forEach((item, i) => {
                    cornerstone.disable(item)
                    cornerstone.enable(item)
                    let url = `${this.loadUrl}?frame=${i}`
                    cornerstone.loadImage(url).then((image) => {
                        cornerstone.displayImage(item, image);
                    })
                })
            })
        },
        showViewList() {
            if (this.layout == 0) {
                return
            }
            this.$nextTick(() => {
                let views = this.$refs.views
                let n = 0
                this.layoutArr[this.layout].forEach((row, i) => {
                    row.forEach((col, j) => {
                        let index = n;
                        n++;
                        let frameNum = (this.activeIndex + index) % this.frames
                        let url = `${this.loadUrl}?frame=${frameNum}`
                        cornerstone.disable(views[index])
                        cornerstone.enable(views[index])
                        cornerstone.loadImage(url).then((image) => {
                            cornerstone.displayImage(views[index], image);
                            this.setDefaultTools(views[index])
                        })
                    })
                })
            })
        },
        showView() {
            let view = this.$refs.view
            let url = `${this.loadUrl}?frame=${this.activeIndex}`
            cornerstone.loadImage(url).then((image) => {
                cornerstone.displayImage(view, image);
                this.setDefaultTools(view)
            })
        },
        switchActive(index) {
            this.activeIndex = index
        },
        viewClick() {
            this.stop()
        },
        setDefaultTools(view) {
            if (view == this.$refs.view) {
                this.disableAllTools(this.$refs.view);
            }
            if (!this.isPc) {
                cornerstoneTools.touchInput.enable(view);
                cornerstoneTools.panTouchDrag.activate(view);
                cornerstoneTools.zoomTouchPinch.activate(view);
            } else {
                cornerstoneTools.touchInput.enable(view);
                cornerstoneTools.mouseInput.enable(view);
                cornerstoneTools.mouseWheelInput.enable(view);
                cornerstoneTools.magnify.enable(view);
                cornerstoneTools.magnifyTouchDrag.enable(view);
                cornerstoneTools.probe.enable(view);
                cornerstoneTools.length.enable(view);
                cornerstoneTools.ellipticalRoi.enable(view);
                cornerstoneTools.rectangleRoi.enable(view);
                cornerstoneTools.angle.enable(view);
                cornerstoneTools.highlight.enable(view);

                // Enable all tools we want to use with this view
                cornerstoneTools.wwwc.activate(view, 1); // ww/wc is the default tool for left mouse button
                cornerstoneTools.pan.activate(view, 2); // pan is the default tool for middle mouse button
                cornerstoneTools.zoom.activate(view, 4); // zoom is the default tool for right mouse button
                cornerstoneTools.zoomWheel.activate(view); // zoom is the default tool for middle mouse wheel

            }
        },
        disableAllTools(view) {
            cornerstoneTools.wwwc.disable(view);
            cornerstoneTools.pan.activate(view, 2); // 2 is middle mouse button
            cornerstoneTools.zoom.activate(view, 4); // 4 is right mouse button
            cornerstoneTools.probe.deactivate(view, 1);
            cornerstoneTools.length.deactivate(view, 1);
            cornerstoneTools.ellipticalRoi.deactivate(view, 1);
            cornerstoneTools.rectangleRoi.deactivate(view, 1);
            cornerstoneTools.angle.deactivate(view, 1);
            cornerstoneTools.highlight.deactivate(view, 1);
            cornerstoneTools.freehand.deactivate(view, 1);
            cornerstoneTools.arrowAnnotate.deactivate(view, 1);
            cornerstoneTools.arrowAnnotateTouch.deactivate(view);
            cornerstoneTools.simpleAngle.deactivate(view, 1);
            cornerstoneTools.seedAnnotate.deactivate(view, 1);
            cornerstoneTools.seedAnnotateTouch.deactivate(view);

            cornerstoneTools.magnify.deactivate(view, 1);

            cornerstoneTools.magnifyTouchDrag.deactivate(view);
            cornerstoneTools.panTouchDrag.deactivate(view);
            cornerstoneTools.wwwcTouchDrag.deactivate(view);
            cornerstoneTools.lengthTouch.deactivate(view);
            cornerstoneTools.ellipticalRoiTouch.deactivate(view);
        },
        isActive(tool) {
            if (this.activeTool && this.activeTool == tool) {
                return {active: true}
            }
            return {}
        },
        play() {
            if (this.layout > 0) {
                return
            }
            this.disableAllTools(this.$refs.view);
            if (this.playHandler) {
                this.stop()
                this.activeTool = ''
            } else if (this.frames) {
                this.activeTool = 'play'
                this.playHandler = setInterval(() => {
                    this.activeIndex = (this.activeIndex + 1) % this.frames
                }, 100)
            }
        },
        stop() {
            if (this.playHandler) {
                clearInterval(this.playHandler)
                this.playHandler = null
            }
        },

        // 工具栏事件
        resetTool() {
            location.reload()
            /*  this.layout = 0
              this.activeTool = ''
              this.showView()
              this.setDefaultTools(this.$refs.view)
              let toolStateManager = cornerstoneTools.globalImageIdSpecificToolStateManager;
              // Note that this only works on ImageId-specific tool state managers (for now)
              toolStateManager.clear(this.$refs.view)
              cornerstone.updateImage(this.$refs.view);*/
        },
        textTool() {
            this.disableAllTools(this.$refs.view);
            this.activeTool = 'arrowAnnotate'
            cornerstoneTools.arrowAnnotate.activate(this.$refs.view, 1);
            cornerstoneTools.arrowAnnotateTouch.activate(this.$refs.view);
            this.$nextTick(() => {
                this.$refs.text.focus()
            })
            return false;
        },
        enableWindowLevelTool() {
            this.disableAllTools(this.$refs.view);
            this.activeTool = 'wwwc'
            cornerstoneTools.wwwc.activate(this.$refs.view, 1);
            cornerstoneTools.wwwcTouchDrag.activate(this.$refs.view);
        },
        panTool() {
            this.disableAllTools(this.$refs.view);
            this.activeTool = 'pan'
            cornerstoneTools.pan.activate(this.$refs.view, 3); // 3 means left mouse button and middle mouse button
            cornerstoneTools.panTouchDrag.activate(this.$refs.view); // 3 means left mouse button and middle mouse button
        },
        zoomTool() {
            this.disableAllTools(this.$refs.view);
            this.activeTool = 'zoom'
            cornerstoneTools.zoom.activate(this.$refs.view, 5); // 5 means left mouse button and right mouse button
        },
        enableLengthTool() {
            this.disableAllTools(this.$refs.view);
            this.activeTool = 'length'
            cornerstoneTools.length.activate(this.$refs.view, 1);
            cornerstoneTools.lengthTouch.activate(this.$refs.view);
        },
        probeTool() {
            this.disableAllTools(this.$refs.view);
            this.activeTool = 'probe'
            cornerstoneTools.probe.activate(this.$refs.view, 1);
        },
        circleroiTool() {
            this.disableAllTools(this.$refs.view);
            this.activeTool = 'ellipticalRoi'
            cornerstoneTools.ellipticalRoi.activate(this.$refs.view, 1);
            cornerstoneTools.ellipticalRoiTouch.activate(this.$refs.view);
        },
        rectangleroiTool() {
            this.disableAllTools(this.$refs.view);
            this.activeTool = 'rectangleRoi'
            cornerstoneTools.rectangleRoi.activate(this.$refs.view, 1);
        },
        angleTool() {
            this.disableAllTools(this.$refs.view);
            this.activeTool = 'angle'
            cornerstoneTools.angle.activate(this.$refs.view, 1);
        },
        highlightTool() {
            this.disableAllTools(this.$refs.view);
            this.activeTool = 'highlight'
            cornerstoneTools.highlight.activate(this.$refs.view, 1);
        },
        freehandTool() {
            this.disableAllTools(this.$refs.view);
            this.activeTool = 'freehand'
            cornerstoneTools.freehand.activate(this.$refs.view, 1);
        },
        angleTool() {
            this.disableAllTools(this.$refs.view);
            this.activeTool = 'simpleAngle'
            cornerstoneTools.simpleAngle.activate(this.$refs.view, 1);
        },
        pointTool() {
            this.disableAllTools(this.$refs.view);
            this.activeTool = 'seedAnnotate'
            cornerstoneTools.seedAnnotate.activate(this.$refs.view, 1);
            cornerstoneTools.seedAnnotateTouch.activate(this.$refs.view);
        },
        brushTool() {
            this.disableAllTools(this.$refs.view);
            this.activeTool = 'brush'
            cornerstoneTools.brush.activate(this.$refs.view, 1);
        },
        magnifyTool() {
            this.disableAllTools(this.$refs.view);
            this.activeTool = 'magnify'
            cornerstoneTools.magnify.activate(this.$refs.view, 1);
            cornerstoneTools.magnifyTouchDrag.activate(this.$refs.view);
        },
        rotateTool() {
            let viewport = cornerstone.getViewport(this.$refs.view);
            viewport.rotation += 90;
            cornerstone.setViewport(this.$refs.view, viewport);
        },
        saveTool() {
            cornerstoneTools.saveAs(this.$refs.view, new Date().getTime() + '.png');
        },
        layoutTool() {
            this.disableAllTools(this.$refs.view);
            this.activeTool = 'layout'
        },

        switchLayout(type) {
            this.stop()
            this.layout = type
        },
        openInfo() {
            this.isShowInfo = !this.isShowInfo
        },
        getDcmInfo(key, fun) {
            fun = fun || 'string'
            if (this.image) {
                return this.image.data[fun]('x' + key);
            }
            return ''
        },
        getTextCallback(callback) {
            callback(this.text)
        },
        getSeedAnnotateTextCallback(doneGetTextCallback) {
            this.pNum = this.pNum + 1
            let text = this.pointText + this.pNum
            doneGetTextCallback(text);
        },
        getQueryString(name, url) {
            var reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)", "i");
            if (!url || url == "") {
                url = window.location.search;
            } else {
                url = url.substring(url.indexOf("?"));
            }
            r = url.substr(1).match(reg)
            if (r != null) return unescape(r[2]);
            return null;
        }
    }
})