// @ts-nocheck

import load_mujoco, { type Model, type State, type Simulation } from "../mujoco_wasm/mujoco_wasm";
import * as THREE from 'three';

let global_mujoco = await load_mujoco();
global_mujoco.FS.mkdir('/working');
global_mujoco.FS.mount(global_mujoco.MEMFS, { root: '.' }, '/working');
await write_public();
async function write_public() {
    let files = [
        "public/SO101/scene.xml",
        "public/SO101/README.md",
        "public/SO101/so101_old_calib.xml",
        "public/SO101/assets/motor_holder_so101_base_v1.part",
        "public/SO101/assets/rotation_pitch_so101_v1.stl",
        "public/SO101/assets/base_so101_v2.stl",
        "public/SO101/assets/upper_arm_so101_v1.part",
        "public/SO101/assets/upper_arm_so101_v1.stl",
        "public/SO101/assets/motor_holder_so101_wrist_v1.stl",
        "public/SO101/assets/moving_jaw_so101_v1.part",
        "public/SO101/assets/sts3215_03a_no_horn_v1.part",
        "public/SO101/assets/wrist_roll_pitch_so101_v2.part",
        "public/SO101/assets/sts3215_03a_v1.part",
        "public/SO101/assets/under_arm_so101_v1.stl",
        "public/SO101/assets/sts3215_03a_v1.stl",
        "public/SO101/assets/wrist_roll_follower_so101_v1.part",
        "public/SO101/assets/sts3215_03a_no_horn_v1.stl",
        "public/SO101/assets/motor_holder_so101_wrist_v1.part",
        "public/SO101/assets/base_motor_holder_so101_v1.stl",
        "public/SO101/assets/motor_holder_so101_base_v1.stl",
        "public/SO101/assets/base_motor_holder_so101_v1.part",
        "public/SO101/assets/rotation_pitch_so101_v1.part",
        "public/SO101/assets/wrist_roll_follower_so101_v1.stl",
        "public/SO101/assets/base_so101_v2.part",
        "public/SO101/assets/wrist_roll_pitch_so101_v2.stl",
        "public/SO101/assets/waveshare_mounting_plate_so101_v2.stl",
        "public/SO101/assets/waveshare_mounting_plate_so101_v2.part",
        "public/SO101/assets/moving_jaw_so101_v1.stl",
        "public/SO101/assets/under_arm_so101_v1.part",
        "public/SO101/so101_new_calib.urdf",
        "public/SO101/joints_properties.xml",
        "public/SO101/so101_new_calib.xml",
        "public/SO101/so101_old_cbase_so101_v2alib.urdf",
        "public/humanoid.xml",
    ]
    for (let file_path of files) {
        let file = await fetch(file_path)
        let buffer = await file.arrayBuffer()
        let local_path = "/working/" + file_path.replace("public/", "./")
        console.log("local_path=", local_path)
        let path_dir = local_path.replace(new RegExp("/[^/]*$"), "");
        try {
            global_mujoco.FS.mkdir(path_dir)
        } catch (e) {
            // console.log("e=", e)
        }
        let stream = global_mujoco.FS.open(local_path, 'w+')
        global_mujoco.FS.write(stream, new Uint8Array(buffer), 0, buffer.byteLength, 0);
    }
}

// Check if global_mujoco has mjGEOM constants and use them, otherwise use default values
const mjGEOM_PLANE = global_mujoco.hasOwnProperty('mjGEOM_PLANE') ? global_mujoco.mjGEOM_PLANE : 0;
const mjGEOM_HFIELD = global_mujoco.hasOwnProperty('mjGEOM_HFIELD') ? global_mujoco.mjGEOM_HFIELD : 1;
const mjGEOM_SPHERE = global_mujoco.hasOwnProperty('mjGEOM_SPHERE') ? global_mujoco.mjGEOM_SPHERE : 2;
const mjGEOM_CAPSULE = global_mujoco.hasOwnProperty('mjGEOM_CAPSULE') ? global_mujoco.mjGEOM_CAPSULE : 3;
const mjGEOM_ELLIPSOID = global_mujoco.hasOwnProperty('mjGEOM_ELLIPSOID') ? global_mujoco.mjGEOM_ELLIPSOID : 4;
const mjGEOM_CYLINDER = global_mujoco.hasOwnProperty('mjGEOM_CYLINDER') ? global_mujoco.mjGEOM_CYLINDER : 5;
const mjGEOM_BOX = global_mujoco.hasOwnProperty('mjGEOM_BOX') ? global_mujoco.mjGEOM_BOX : 6;
const mjGEOM_MESH = global_mujoco.hasOwnProperty('mjGEOM_MESH') ? global_mujoco.mjGEOM_MESH : 7;

export class MuJoCoInstance {
    model!: Model;
    state!: State;
    simulation!: Simulation;
    timestep!: number; // 0.002 seconds

    constructor() {
        // 构造函数现在是同步的，需要调用init()来异步初始化
    }

    async init() {
        console.log("MuJoCoInstance init");
        this.model = new global_mujoco.Model("/working/SO101/scene.xml");
        let opt = this.model.getOptions();
        console.log("opt=", opt)
        this.timestep = opt.timestep;
        console.log("model init");
        this.state = new global_mujoco.State(this.model);
        console.log("model init");
        this.simulation = new global_mujoco.Simulation(this.model, this.state);

        console.log("model init");
    }

    /**
     * 设置执行器（关节）的控制值
     * @param actuatorIndex - 执行器的索引 (0 到 model.nu - 1)
     * @param value - 要设置的控制值
     * @returns {boolean} - 如果成功设置返回 true，如果值超出范围返回 false
     */
    setActuatorControl(actuatorIndex: number, value: number): boolean {
        // 检查索引是否有效
        if (actuatorIndex < 0 || actuatorIndex >= this.model.nu) {
            console.error(`Actuator index ${actuatorIndex} is out of range. Valid range is 0 to ${this.model.nu - 1}.`);
            return false;
        }

        // 检查该执行器是否有控制限制
        if (this.model.actuator_ctrllimited[actuatorIndex]) {
            const min = this.model.actuator_ctrlrange[actuatorIndex * 2];
            const max = this.model.actuator_ctrlrange[actuatorIndex * 2 + 1];
            
            // 检查值是否在范围内
            if (value < min || value > max) {
                console.warn(`Control value ${value} for actuator ${actuatorIndex} is out of range [${min}, ${max}]. Clamping value.`);
                // 将值限制在范围内
                value = Math.max(min, Math.min(max, value));
            }
        }

        // 设置控制值
        this.simulation.ctrl[actuatorIndex] = value;
        return true;
    }

    /**
     * 获取仿真时间步长
     * @returns {number} - 仿真时间步长
     */
    getTimestep(): number {
        return this.timestep;
    }

    /**
     * 获取执行器（关节）的名称列表及其控制范围
     * @returns {Array<{name: string, min: number, max: number}>} - 包含所有执行器名称和控制范围的数组
     */
    getActuatorNamesAndRanges(): Array<{name: string, min: number, max: number}> {
        const actuators: Array<{name: string, min: number, max: number}> = [];
        const textDecoder = new TextDecoder("utf-8");
        const names_array = new Uint8Array(this.model.names);
        
        for (let i = 0; i < this.model.nu; i++) {
            // Get actuator name
            const start_idx = this.model.name_actuatoradr[i];
            let end_idx = start_idx;
            while (end_idx < names_array.length && names_array[end_idx] !== 0) {
                end_idx++;
            }
            const name_buffer = names_array.subarray(start_idx, end_idx);
            const name = textDecoder.decode(name_buffer);
            
            // Get actuator range
            let min = -3.14; // Default min
            let max = 3.14;  // Default max
            if (this.model.actuator_ctrllimited[i]) {
                min = this.model.actuator_ctrlrange[i * 2];
                max = this.model.actuator_ctrlrange[i * 2 + 1];
            }
            
            actuators.push({ name, min, max });
        }
        
        return actuators;
    }

    /**
     * 返回可以被Three.js渲染的body对象
     * @returns {Object} 包含bodies和lights的对象，可直接用于Three.js场景
     */
    getThreeJSRenderableBodies() {
        console.log('开始创建Three.js可渲染对象...');
        console.log('模型信息:', {
            nbody: this.model.nbody,
            ngeom: this.model.ngeom,
            nlight: this.model.nlight
        });

        // 解码字符串名称
        let textDecoder = new TextDecoder("utf-8");
        let names_array = new Uint8Array(this.model.names);
        let fullString = textDecoder.decode(this.model.names);
        let nullChar = textDecoder.decode(new ArrayBuffer(1));
        let names = fullString.split(nullChar);

        // 创建根对象
        let mujocoRoot = new THREE.Group();
        mujocoRoot.name = "MuJoCo Root";

        /** @type {Object.<number, THREE.Group>} */
        let bodies = new Map<number, THREE.Group>();
        /** @type {Object.<number, THREE.BufferGeometry>} */
        let meshes = new Map<number, THREE.BufferGeometry>();
        /** @type {THREE.Light[]} */
        let lights: THREE.Light[] = [];

        // 默认材质定义
        let material = new THREE.MeshPhysicalMaterial();
        material.color = new THREE.Color(1, 1, 1);

        // 遍历MuJoCo几何体并在Three.js中重新创建它们
        for (let g = 0; g < this.model.ngeom; g++) {
            // 只可视化几何组到2（与simulate相同的默认行为）
            if (!(this.model.geom_group[g] < 3)) { continue; }

            // 获取几何体的body ID和类型
            let b = this.model.geom_bodyid[g];
            let type = this.model.geom_type[g];
            let size = [
                this.model.geom_size[(g * 3) + 0],
                this.model.geom_size[(g * 3) + 1],
                this.model.geom_size[(g * 3) + 2]
            ];

            // 如果body不存在则创建它
            if (!(b in bodies)) {
                bodies[b] = new THREE.Group();

                let start_idx = this.model.name_bodyadr[b];
                let end_idx = start_idx;
                while (end_idx < names_array.length && names_array[end_idx] !== 0) {
                    end_idx++;
                }
                let name_buffer = names_array.subarray(start_idx, end_idx);
                bodies[b].name = textDecoder.decode(name_buffer);

                bodies[b].bodyID = b;
                bodies[b].has_custom_mesh = false;
            }

            // 设置默认几何体。在MuJoCo中，这是一个球体
            let geometry = new THREE.SphereGeometry(size[0] * 0.5) as THREE.BufferGeometry;

            if (type == global_mujoco.mjtGeom.mjGEOM_PLANE.value) {
                // 平面的特殊处理
                geometry = new THREE.PlaneGeometry(100, 100);
                geometry.rotateX(- Math.PI / 2);
            } else if (type == global_mujoco.mjtGeom.mjGEOM_SPHERE.value) {
                geometry = new THREE.SphereGeometry(size[0]);
            } else if (type == global_mujoco.mjtGeom.mjGEOM_CAPSULE.value) {
                geometry = new THREE.CapsuleGeometry(size[0], size[1] * 2.0, 20, 20);
            } else if (type == global_mujoco.mjtGeom.mjGEOM_ELLIPSOID.value) {
                geometry = new THREE.SphereGeometry(1); // 下面会拉伸这个
            } else if (type == global_mujoco.mjtGeom.mjGEOM_CYLINDER.value) {
                geometry = new THREE.CylinderGeometry(size[0], size[0], size[1] * 2.0);
            } else if (type == global_mujoco.mjtGeom.mjGEOM_BOX.value) {
                geometry = new THREE.BoxGeometry(size[0] * 2.0, size[2] * 2.0, size[1] * 2.0);
            } else if (type == global_mujoco.mjtGeom.mjGEOM_MESH.value) {
                let meshID = this.model.geom_dataid[g];

                if (!(meshID in meshes)) {
                    geometry = new THREE.BufferGeometry();

                    let vertex_buffer = this.model.mesh_vert.subarray(
                        this.model.mesh_vertadr[meshID] * 3,
                        (this.model.mesh_vertadr[meshID] + this.model.mesh_vertnum[meshID]) * 3);

                    // 坐标系转换
                    for (let v = 0; v < vertex_buffer.length; v += 3) {
                        let temp = vertex_buffer[v + 1];
                        vertex_buffer[v + 1] = vertex_buffer[v + 2];
                        vertex_buffer[v + 2] = -temp;
                    }

                    let normal_buffer = this.model.mesh_normal.subarray(
                        this.model.mesh_vertadr[meshID] * 3,
                        (this.model.mesh_vertadr[meshID] + this.model.mesh_vertnum[meshID]) * 3);

                    for (let v = 0; v < normal_buffer.length; v += 3) {
                        let temp = normal_buffer[v + 1];
                        normal_buffer[v + 1] = normal_buffer[v + 2];
                        normal_buffer[v + 2] = -temp;
                    }

                    let uv_buffer = this.model.mesh_texcoord.subarray(
                        this.model.mesh_texcoordadr[meshID] * 2,
                        (this.model.mesh_texcoordadr[meshID] + this.model.mesh_vertnum[meshID]) * 2);

                    let triangle_buffer = this.model.mesh_face.subarray(
                        this.model.mesh_faceadr[meshID] * 3,
                        (this.model.mesh_faceadr[meshID] + this.model.mesh_facenum[meshID]) * 3);

                    geometry.setAttribute("position", new THREE.BufferAttribute(vertex_buffer, 3));
                    geometry.setAttribute("normal", new THREE.BufferAttribute(normal_buffer, 3));
                    geometry.setAttribute("uv", new THREE.BufferAttribute(uv_buffer, 2));
                    geometry.setIndex(Array.from(triangle_buffer));
                    meshes[meshID] = geometry;
                } else {
                    geometry = meshes[meshID];
                }

                bodies[b].has_custom_mesh = true;
            }

            // 设置材质属性
            let color = [
                this.model.geom_rgba[(g * 4) + 0],
                this.model.geom_rgba[(g * 4) + 1],
                this.model.geom_rgba[(g * 4) + 2],
                this.model.geom_rgba[(g * 4) + 3]
            ];

            if (this.model.geom_matid[g] != -1) {
                let matId = this.model.geom_matid[g];
                color = [
                    this.model.mat_rgba[(matId * 4) + 0],
                    this.model.mat_rgba[(matId * 4) + 1],
                    this.model.mat_rgba[(matId * 4) + 2],
                    this.model.mat_rgba[(matId * 4) + 3]
                ];
            }

            material = new THREE.MeshPhysicalMaterial({
                color: new THREE.Color(color[0], color[1], color[2]),
                transparent: color[3] < 1.0,
                opacity: color[3],
                specularIntensity: this.model.geom_matid[g] != -1 ? this.model.mat_specular[this.model.geom_matid[g]] * 0.5 : undefined,
                reflectivity: this.model.geom_matid[g] != -1 ? this.model.mat_reflectance[this.model.geom_matid[g]] : undefined,
                roughness: this.model.geom_matid[g] != -1 ? 1.0 - this.model.mat_shininess[this.model.geom_matid[g]] : undefined,
                metalness: this.model.geom_matid[g] != -1 ? 0.1 : undefined
            });

            let mesh = new THREE.Mesh(geometry, material);
            mesh.castShadow = g == 0 ? false : true;
            mesh.receiveShadow = type != 7;
            mesh.bodyID = b;
            bodies[b].add(mesh);

            // 设置位置和旋转
            this.getPosition(this.model.geom_pos, g, mesh.position);
            if (type != 0) {
                this.getQuaternion(this.model.geom_quat, g, mesh.quaternion);
            }
            if (type == 4) {
                mesh.scale.set(size[0], size[2], size[1]); // 拉伸椭球体
            }
        }

        // 解析灯光
        for (let l = 0; l < this.model.nlight; l++) {
            let light;
            if (this.model.light_directional[l]) {
                light = new THREE.DirectionalLight();
            } else {
                light = new THREE.SpotLight();
            }
            light.decay = this.model.light_attenuation[l] * 100;
            light.penumbra = 0.5;
            light.castShadow = true;

            light.shadow.mapSize.width = 1024;
            light.shadow.mapSize.height = 1024;
            light.shadow.camera.near = 1;
            light.shadow.camera.far = 10;

            if (bodies[0]) {
                bodies[0].add(light);
            } else {
                mujocoRoot.add(light);
            }
            lights.push(light);
        }

        // 如果没有灯光，添加默认灯光
        if (this.model.nlight == 0) {
            let light = new THREE.DirectionalLight();
            mujocoRoot.add(light);
            lights.push(light);
        }

        // 构建body层次结构
        console.log('构建body层次结构，总body数量:', this.model.nbody);
        console.log('当前bodies对象包含的body ID:', Object.keys(bodies));

        for (let b = 0; b < this.model.nbody; b++) {
            // 确保所有body都存在，即使没有几何体
            if (!(b in bodies)) {
                console.log(`创建缺失的body ${b}`);
                bodies[b] = new THREE.Group();

                // 尝试获取body名称
                let start_idx = this.model.name_bodyadr[b];
                let end_idx = start_idx;
                while (end_idx < names_array.length && names_array[end_idx] !== 0) {
                    end_idx++;
                }
                let name_buffer = names_array.subarray(start_idx, end_idx);
                bodies[b].name = textDecoder.decode(name_buffer) || `body_${b}`;
                bodies[b].bodyID = b;
                bodies[b].has_custom_mesh = false;
            }

            // 添加到层次结构
            console.log(`添加body ${b} (${bodies[b].name}) 到层次结构`);
            if (b == 0 || !bodies[0]) {
                mujocoRoot.add(bodies[b]);
            } else {
                bodies[0].add(bodies[b]);
            }
        }

        console.log('Three.js可渲染对象创建完成');
        console.log('最终结果:', {
            mujocoRoot: mujocoRoot,
            bodiesCount: Object.keys(bodies).length,
            lightsCount: lights.length,
            meshesCount: Object.keys(meshes).length
        });

        return {
            mujocoRoot: mujocoRoot,
            bodies: bodies,
            lights: lights,
            meshes: meshes
        };
    }

    /**
     * 更新Three.js对象的位置和旋转以匹配当前的MuJoCo状态
     * @param {Object} renderableData - 从getThreeJSRenderableBodies()返回的数据
     */
    updateThreeJSBodies(renderableData: {bodies: Map<number, THREE.Group>;}) {
        const { bodies } = renderableData;

        // 更新每个body的位置和旋转
        for (let b = 0; b < this.model.nbody; b++) {
            if (bodies[b]) {
                // 获取body的位置和旋转
                this.getPosition(this.simulation.xpos, b, bodies[b].position);
                this.getQuaternion(this.simulation.xquat, b, bodies[b].quaternion);
            }
        }
    }

    /**
     * 辅助函数：从缓冲区获取位置并应用到Three.js Vector3
     * @param {Float32Array|Float64Array} buffer
     * @param {number} index
     * @param {THREE.Vector3} target
     */
    getPosition(buffer: Float32Array | Float64Array, index: number, target: THREE.Vector3) {
        // Convert from MuJoCo (Z-up) to Three.js (Y-up) coordinate system
        // x = x
        // y = z
        // z = -y
        return target.set(
            buffer[(index * 3) + 0],
            buffer[(index * 3) + 2],
            -buffer[(index * 3) + 1]
        );
    }

    /**
     * 辅助函数：从缓冲区获取四元数并应用到Three.js Quaternion
     * @param {Float32Array|Float64Array} buffer
     * @param {number} index
     * @param {THREE.Quaternion} target
     */
    getQuaternion(buffer: Float32Array | Float64Array, index: number, target: THREE.Quaternion) {
        // MuJoCo uses [w, x, y, z] convention, Three.js uses [x, y, z, w]
        const w = buffer[(index * 4) + 0];
        const x = buffer[(index * 4) + 1];
        const y = buffer[(index * 4) + 2];
        const z = buffer[(index * 4) + 3];
        
        // Convert from MuJoCo (Z-up) to Three.js (Y-up) coordinate system
        // This is equivalent to a -90 degree rotation around the X axis
        // The quaternion for this rotation is [sqrt(2)/2, -sqrt(2)/2, 0, 0]
        // To combine rotations, we multiply quaternions: q_result = q_rotation * q_original
        // But for simplicity, we can directly transform the components:
        // x = x
        // y = z
        // z = -y
        // w = w
        return target.set(x, z, -y, w);
    }
}