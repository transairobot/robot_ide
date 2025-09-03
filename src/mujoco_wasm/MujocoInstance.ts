// @ts-nocheck

import load_mujoco, { type Model, type State, type Simulation } from "../mujoco_wasm/mujoco_wasm";
import * as THREE from 'three';

const global_mujoco = await load_mujoco();
global_mujoco.FS.mkdir('/working');
global_mujoco.FS.mount(global_mujoco.MEMFS, { root: '.' }, '/working');

/**
 * 将explorer中的文件同步到MuJoCo文件系统中
 * @param fileItems - 来自explorer的文件项数组
 */
export function writeFilesToMuJoCoFS(fileItems: any[]) {
    // 遍历所有文件项
    for (const fileItem of fileItems) {
        syncFileItem(fileItem, '/working');
    }

    console.log('文件同步完成');
}

/**
 * 递归同步单个文件项到MuJoCo文件系统
 * @param fileItem - 文件项对象
 * @param basePath - 基础路径
 */
function syncFileItem(fileItem: any, basePath: string) {
    const fullPath = `${basePath}/${fileItem.name}`;

    if (fileItem.type === 'folder') {
        // 创建文件夹
        try {
            global_mujoco.FS.mkdir(fullPath);
            console.log(`创建文件夹: ${fullPath}`);
        } catch (e) {
            // 文件夹可能已存在
            console.log(`文件夹已存在或创建失败: ${fullPath}`, e);
        }

        // 递归处理子项
        if (fileItem.children && fileItem.children.length > 0) {
            for (const child of fileItem.children) {
                syncFileItem(child, fullPath);
            }
        }
    } else if (fileItem.type === 'file') {
        // 创建文件
        try {
            // 确保父目录存在
            const dirPath = fullPath.replace(new RegExp("/[^/]*$"), "");
            try {
                global_mujoco.FS.mkdir(dirPath);
            } catch (e) {
                // 目录可能已存在
            }

            // 写入文件内容
            if (fileItem.content) {
                const stream = global_mujoco.FS.open(fullPath, 'w+');
                global_mujoco.FS.write(stream, new Uint8Array(fileItem.content), 0, fileItem.content.byteLength, 0);
                global_mujoco.FS.close(stream);
                // console.log(`写入文件: ${fullPath}, 大小: ${fileItem.content.byteLength} 字节`);
            } else {
                // 创建空文件
                const stream = global_mujoco.FS.open(fullPath, 'w+');
                global_mujoco.FS.write(stream, new Uint8Array(0), 0, 0, 0);
                global_mujoco.FS.close(stream);
                console.log(`创建空文件: ${fullPath}`);
            }
        } catch (e) {
            console.error(`写入文件失败: ${fullPath}`, e);
        }
    }
}

export class ActuatorInfo {
    name: string;
    id: number;
    joint_id: number;
    type: 'motor' | 'position';
    vendor: string = 'mujoco';
    model: string = 'generic';
    ctrl: number;
    ctrl_min: number;
    ctrl_max: number;
    force_min: number;
    force_max: number;
    constructor(
        name: string,
        id: number,
        joint_id: number,
        type: 'motor' | 'position',
        ctrl: number,
        ctrl_min: number,
        ctrl_max: number,
        force_min: number,
        force_max: number) {
        this.name = name;
        this.id = id;
        this.joint_id = joint_id;
        this.type = type;
        this.ctrl = ctrl;
        this.ctrl_min = ctrl_min;
        this.ctrl_max = ctrl_max;
        this.force_min = force_min;
        this.force_max = force_max;
    }
}

export class JointInfo {
    name: string;
    id: number;
    type: 'hinge' | 'slide' | 'ball' | 'free';
    dof_dim: number;
    joint_pos: number[];
}

export class MuJoCoInstance {
    model!: Model;
    state!: State;
    simulation!: Simulation;
    timestep!: number; // 0.002 seconds
    private simulationInterval: number | null = null;

    constructor(filepath: string) {
        console.log("filepath=", filepath)
        filepath = "/working/" + filepath;
        this.model = new global_mujoco.Model(filepath);
        const opt = this.model.getOptions();
        this.timestep = opt.timestep;
        this.state = new global_mujoco.State(this.model);
        this.simulation = new global_mujoco.Simulation(this.model, this.state);
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

    setActuatorControls(actuatorIndex: number[], value: number[]): boolean {
        if (actuatorIndex.length !== value.length) {
            console.error('Actuator indices and values arrays must have the same length.');
            return false;
        }
        for (let i = 0; i < actuatorIndex.length; i++) {
            if (!this.setActuatorControl(actuatorIndex[i], value[i])) {
                return false;
            }
        }
    }

    /**
     * 获取每个关节的位置值(qpos)
     * @returns Float32Array - 包含关节名称和位置值的数组
     */
    getJointPos(): Float32Array {
        const joints: number[] = [];
        const textDecoder = new TextDecoder("utf-8");
        const names_array = new Uint8Array(this.model.names);

        // 遍历所有关节
        for (let i = 0; i < this.model.njnt; i++) {
            // 获取关节名称
            const start_idx = this.model.name_jntadr[i];
            let end_idx = start_idx;
            while (end_idx < names_array.length && names_array[end_idx] !== 0) {
                end_idx++;
            }
            const name_buffer = names_array.subarray(start_idx, end_idx);
            const name = textDecoder.decode(name_buffer);

            // 使用jnt_qposadr获取关节在qpos数组中的索引
            const qpos_index = this.model.jnt_qposadr[i];
            const qpos = this.simulation.qpos[qpos_index];

            joints.push(qpos)
        }
        let res = new Float32Array(joints.length)
        res.set(joints)
        return res;
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
    getActuatorNamesAndRanges(): Array<{ name: string, min: number, max: number }> {
        const actuators: Array<{ name: string, min: number, max: number }> = [];
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
        const textDecoder = new TextDecoder("utf-8");
        const names_array = new Uint8Array(this.model.names);
        const fullString = textDecoder.decode(this.model.names);
        const nullChar = textDecoder.decode(new ArrayBuffer(1));
        const names = fullString.split(nullChar);

        // 创建根对象
        const mujocoRoot = new THREE.Group();
        mujocoRoot.name = "MuJoCo Root";

        /** @type {Object.<number, THREE.Group>} */
        const bodies = new Map<number, THREE.Group>();
        /** @type {Object.<number, THREE.BufferGeometry>} */
        const meshes = new Map<number, THREE.BufferGeometry>();
        /** @type {THREE.Light[]} */
        const lights: THREE.Light[] = [];

        // 默认材质定义
        let material = new THREE.MeshPhysicalMaterial();
        material.color = new THREE.Color(1, 1, 1);

        // 遍历MuJoCo几何体并在Three.js中重新创建它们
        for (let g = 0; g < this.model.ngeom; g++) {
            // 只可视化几何组到2（与simulate相同的默认行为）
            if (!(this.model.geom_group[g] < 3)) { continue; }

            // 获取几何体的body ID和类型
            const b = this.model.geom_bodyid[g];
            const type = this.model.geom_type[g];
            const size = [
                this.model.geom_size[(g * 3) + 0],
                this.model.geom_size[(g * 3) + 1],
                this.model.geom_size[(g * 3) + 2]
            ];

            // 如果body不存在则创建它
            if (!(b in bodies)) {
                bodies[b] = new THREE.Group();

                const start_idx = this.model.name_bodyadr[b];
                let end_idx = start_idx;
                while (end_idx < names_array.length && names_array[end_idx] !== 0) {
                    end_idx++;
                }
                const name_buffer = names_array.subarray(start_idx, end_idx);
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
                const meshID = this.model.geom_dataid[g];

                if (!(meshID in meshes)) {
                    geometry = new THREE.BufferGeometry();

                    const vertex_buffer = this.model.mesh_vert.subarray(
                        this.model.mesh_vertadr[meshID] * 3,
                        (this.model.mesh_vertadr[meshID] + this.model.mesh_vertnum[meshID]) * 3);

                    // 坐标系转换
                    for (let v = 0; v < vertex_buffer.length; v += 3) {
                        const temp = vertex_buffer[v + 1];
                        vertex_buffer[v + 1] = vertex_buffer[v + 2];
                        vertex_buffer[v + 2] = -temp;
                    }

                    const normal_buffer = this.model.mesh_normal.subarray(
                        this.model.mesh_vertadr[meshID] * 3,
                        (this.model.mesh_vertadr[meshID] + this.model.mesh_vertnum[meshID]) * 3);

                    for (let v = 0; v < normal_buffer.length; v += 3) {
                        const temp = normal_buffer[v + 1];
                        normal_buffer[v + 1] = normal_buffer[v + 2];
                        normal_buffer[v + 2] = -temp;
                    }

                    const uv_buffer = this.model.mesh_texcoord.subarray(
                        this.model.mesh_texcoordadr[meshID] * 2,
                        (this.model.mesh_texcoordadr[meshID] + this.model.mesh_vertnum[meshID]) * 2);

                    const triangle_buffer = this.model.mesh_face.subarray(
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
                const matId = this.model.geom_matid[g];
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

            const mesh = new THREE.Mesh(geometry, material);
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
            const light = new THREE.DirectionalLight();
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
                const start_idx = this.model.name_bodyadr[b];
                let end_idx = start_idx;
                while (end_idx < names_array.length && names_array[end_idx] !== 0) {
                    end_idx++;
                }
                const name_buffer = names_array.subarray(start_idx, end_idx);
                bodies[b].name = textDecoder.decode(name_buffer) || `body_${b}`;
                bodies[b].bodyID = b;
                bodies[b].has_custom_mesh = false;
            }

            // 添加到层次结构
            // console.log(`添加body ${b} (${bodies[b].name}) 到层次结构`);
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
    updateThreeJSBodies(renderableData: { bodies: Map<number, THREE.Group>; }) {
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
        return target.set(x, z, -y, w);
    }

    getActuatorInfo(): ActuatorInfo[] {
        const actuators: ActuatorInfo[] = [];
        const textDecoder = new TextDecoder("utf-8");
        const names_array = new Uint8Array(this.model.names);

        for (let i = 0; i < this.model.nu; i++) {
            // 获取执行器名称
            const start_idx = this.model.name_actuatoradr[i];
            let end_idx = start_idx;
            while (end_idx < names_array.length && names_array[end_idx] !== 0) {
                end_idx++;
            }
            const name_buffer = names_array.subarray(start_idx, end_idx);
            const name = textDecoder.decode(name_buffer);

            // 类型推断（这里只做简单判断，可根据需要扩展）
            let type: 'motor' | 'position' = "motor";
            if (this.model.actuator_trntype && this.model.actuator_biastype[i] === 1) {
                type = "position";
            }

            // 控制范围
            let ctrl_min = -1, ctrl_max = 1;
            if (this.model.actuator_ctrllimited[i]) {
                ctrl_min = this.model.actuator_ctrlrange[i * 2];
                ctrl_max = this.model.actuator_ctrlrange[i * 2 + 1];
            }

            let ctrl = this.simulation.ctrl[i];

            // 力范围
            let force_min = -1, force_max = 1;
            if (this.model.actuator_forcelimited && this.model.actuator_forcelimited[i]) {
                force_min = this.model.actuator_forcerange[i * 2];
                force_max = this.model.actuator_forcerange[i * 2 + 1];
            }

            let joint_id = -1;
            if (this.model.actuator_trntype[i] === global_mujoco.mjtTrn.mjTRN_JOINT.value) {
                joint_id = this.model.actuator_trnid[i * 2];
            }

            actuators.push(new ActuatorInfo(
                name,
                i,
                joint_id,
                type,
                ctrl,
                ctrl_min,
                ctrl_max,
                force_min,
                force_max
            ));
        }
        return actuators;
    }

    getJointInfo(): JointInfo[] {
        const joints: JointInfo[] = [];
        const textDecoder = new TextDecoder("utf-8");
        const names_array = new Uint8Array(this.model.names);

        // 遍历所有关节
        for (let i = 0; i < this.model.njnt; i++) {
            // 获取关节名称
            const start_idx = this.model.name_jntadr[i];
            let end_idx = start_idx;
            while (end_idx < names_array.length && names_array[end_idx] !== 0) {
                end_idx++;
            }
            const name_buffer = names_array.subarray(start_idx, end_idx);
            const name = textDecoder.decode(name_buffer);

            // 使用jnt_type获取关节类型
            let type = "hinge";
            let dof_dim = 0;
            switch (this.model.jnt_type[i]) {
                case global_mujoco.mjtJoint.mjJNT_HINGE.value:
                    type = "hinge";
                    dof_dim = 1;
                    break;
                case global_mujoco.mjtJoint.mjJNT_SLIDE.value:
                    type = "slide";
                    dof_dim = 1;
                    break;
                case global_mujoco.mjtJoint.mjJNT_BALL.value:
                    type = "ball";
                    dof_dim = 3;
                    break;
                case global_mujoco.mjtJoint.mjJNT_FREE.value:
                    type = "free";
                    dof_dim = 6;
                    break;
                default:
                    type = "unknown";
            }

            // 获取关节位置值
            const qpos_index = this.model.jnt_qposadr[i];
            const joint_pos = [];
            for (let d = 0; d < dof_dim; d++) {
                joint_pos.push(this.simulation.qpos[qpos_index + d]);
            }

            joints.push({
                name: name,
                id: i,
                type: type,
                dof_dim: dof_dim,
                joint_pos: joint_pos
            });
        }
        return joints;
    }
}