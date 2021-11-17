import { OBSProcessObject } from "../../../static/typings/obs";

const cp = require('child_process')
const path = require('path');
const fs = require('fs');

class ObsProcess {

    async checkObsInstalled(obsPath:string){
        return new Promise((resolve, reject) =>{
            try{
                const _stat_dir = fs.statSync(obsPath)
                const _stat_exe = fs.statSync(path.join(obsPath,'/bin/64bit/obs64.exe'))
                if(_stat_dir.isDirectory() && _stat_exe.isFile()){
                    return resolve(true)
                }else{
                    return resolve(false)
                }
            }catch(err){
                return resolve(false)
            }

            
        })
       
    }



    checkObsRunning():Promise<OBSProcessObject>{
        return new Promise((resolve, reject) =>{
            try{
                cp.exec('tasklist | findstr "obs64.exe"',(error,stdout,stderr)=>{
                    if(stdout){
                        const pid = stdout.replace(/\s+/g," ").trim().split(' ')[1]
                      return  resolve({
                            running:true,
                            pid:pid,
                        })
                    }else{
                      return  resolve({
                            running:false,
                            pid:0,
                        })
                    }
                })
            }catch(err){
                return  resolve({
                    running:false,
                    pid:0,
                })
            }
            
        })
    }

    closeObsProcess(pid:number){
        return new Promise((resolve, reject) =>{
            cp.exec(`taskkill /PID ${pid} -t -f`,(error,stdout,stderr)=>{
                if(stdout){
                    return resolve({
                        closed:true
                    })
                }else{
                    return resolve({
                        closed:false
                    })
                }
            })
        })

        
    }

    // 打开obs软件
    openObsProcess(obsPath:string){
        return new Promise((resolve, reject) =>{
            const obsdir = path.join(obsPath,'/bin/64bit')
            const obsexe =  path.join(obsPath,'/bin/64bit/obs64.exe')
            const command = `cd /d "${obsdir}" && "${obsexe}"`
            cp.exec(command,(error,stdout,stderr)=>{
                if(error){
                   return resolve(false)
                }else {
                   return resolve(true)
                }
            })
           return resolve(true)
        })
       

    }

}

export const obsProcess = new ObsProcess();