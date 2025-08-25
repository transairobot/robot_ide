import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { MuJoCoInstance } from './MujocoManager';

/**
 * 使用MuJoCoInstance创建Three.js场景的示例
 */
export class MujocoThreeJSRenderer {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            alpha: true,
            powerPreference: "high-performance"
        });
        this.controls = null;
        this.mujocoInstance = null;
        this.renderableData = null;
        
        this.setupRenderer();
        this.setupCamera();
        this.setupControls();
        this.setupLights();
    }

    setupRenderer() {
        // 设置像素比例以避免模糊
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        
        // 设置渲染质量
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        
        document.body.appendChild(this.renderer.domElement);
    }

    setupCamera() {
        this.camera.position.set(2, 2, 2);
        this.camera.lookAt(0, 0, 0);
    }

    setupControls() {
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = false;
        this.controls.minDistance = 0.5;
        this.controls.maxDistance = 50;
        this.controls.maxPolarAngle = Math.PI;
        this.controls.target.set(0, 0.5, 0);
    }

    setupLights() {
        // 添加环境光
        const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
        this.scene.add(ambientLight);

        // 添加方向光
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 5, 5);
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);
    }

    /**
     * 初始化MuJoCo实例并加载模型
     */
    async initMujoco() {
        try {
            this.mujocoInstance = new MuJoCoInstance();
            await this.mujocoInstance.init();
            
            // 获取可渲染的bodies
            this.renderableData = this.mujocoInstance.getThreeJSRenderableBodies();
            
            // 将MuJoCo根对象添加到场景中
            this.scene.add(this.renderableData.mujocoRoot);
            
            console.log('MuJoCo模型加载成功');
            console.log('Bodies数量:', Object.keys(this.renderableData.bodies).length);
            console.log('灯光数量:', this.renderableData.lights.length);
            
        } catch (error) {
            console.error('初始化MuJoCo失败:', error);
        }
    }

    /**
     * 运行仿真并更新渲染
     */
    simulate() {
        if (!this.mujocoInstance || !this.renderableData) {
            return;
        }

        // 运行MuJoCo仿真步骤
        this.mujocoInstance.simulation.step();
        
        // 更新Three.js对象的位置
        this.mujocoInstance.updateThreeJSBodies(this.renderableData);
    }

    /**
     * 渲染循环
     */
    animate() {
        requestAnimationFrame(() => this.animate());
        
        // 更新控制器
        if (this.controls) {
            this.controls.update();
        }
        
        // 运行仿真
        this.simulate();
        
        // 渲染场景
        this.renderer.render(this.scene, this.camera);
    }

    /**
     * 开始渲染
     */
    async start() {
        await this.initMujoco();
        this.animate();
    }

    /**
     * 重置仿真
     */
    reset() {
        if (this.mujocoInstance) {
            this.mujocoInstance.simulation.resetData();
            this.mujocoInstance.simulation.forward();
        }
    }

    /**
     * 重置相机位置
     */
    resetCamera() {
        if (this.camera && this.controls) {
            this.camera.position.set(2, 2, 2);
            this.controls.target.set(0, 0.5, 0);
            this.controls.update();
        }
    }

    /**
     * 设置控制输入
     * @param {number[]} controls - 控制输入数组
     */
    setControls(controls) {
        if (this.mujocoInstance && controls) {
            for (let i = 0; i < Math.min(controls.length, this.mujocoInstance.model.nu); i++) {
                this.mujocoInstance.simulation.ctrl[i] = controls[i];
            }
        }
    }

    /**
     * 获取当前关节位置
     * @returns {Float32Array} 关节位置数组
     */
    getJointPositions() {
        if (this.mujocoInstance) {
            return this.mujocoInstance.simulation.qpos;
        }
        return null;
    }

    /**
     * 获取当前关节速度
     * @returns {Float32Array} 关节速度数组
     */
    getJointVelocities() {
        if (this.mujocoInstance) {
            return this.mujocoInstance.simulation.qvel;
        }
        return null;
    }

    /**
     * 清理资源
     */
    dispose() {
        if (this.renderer) {
            this.renderer.dispose();
            document.body.removeChild(this.renderer.domElement);
        }
        
        if (this.mujocoInstance) {
            // 清理MuJoCo资源
            this.mujocoInstance.simulation.free();
        }
    }

    /**
     * 清理资源
     */
    dispose() {
        if (this.controls) {
            this.controls.dispose();
        }
        
        if (this.renderer) {
            this.renderer.dispose();
        }
        
        if (this.mujocoInstance) {
            this.mujocoInstance.simulation.free();
        }
    }
}

// 使用示例
export async function createMujocoRenderer() {
    const renderer = new MujocoThreeJSRenderer();
    await renderer.start();
    return renderer;
}
