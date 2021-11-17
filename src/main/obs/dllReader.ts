import { IOBS_DLL_INFO } from "../../../static/typings/obs"


// 调用dll（使用了windows自带的version.dll来读取dll的信息）
const ffi = require('ffi-napi')
// 用来设置buffer的
const ref = require('ref-napi')
// 用来做转码的
const iconvlite = require('iconv-lite')


const versionDLL = ffi.Library('C://WINDOWS//System32//version',{
    'GetFileVersionInfoSizeA': [ 'int', ['string', 'int'] ],
    'GetFileVersionInfoA': ['int', ['string', 'int', 'int', ref.refType(ref.types.char)]],
    'VerQueryValueA': ['int', [ref.refType(ref.types.char), 'string',ref.refType(ref.types.CString), ref.refType('int')]] 
})


const FileVersion = ()=>{
    
    // 16进制format
    const _int16Format4 = (num:number)=>{
        const s = '0000'
        const f = num.toString(16)
        return s.substr(0,4-f.length) + f
    }

    //根据属性名称读取对应的属性
    const _getInfo = (buf:Buffer,pre:string,name:string)=>{
        // @ts-ignore
        const infoBufferPointer = Buffer.alloc(1000).ref()
        const length = ref.alloc('int')
        // console.log(pre+name)
        if(versionDLL.VerQueryValueA(buf,pre+name,infoBufferPointer,length)!==0){
            const infoBuffer = infoBufferPointer.deref().slice(0,length.deref()-1)
            return iconvlite.decode(infoBuffer,'utf8')
        }else{
            // console.log('info'+name+'did not exist')
            return undefined
        }

    }

    // 获取属性标记
    const _getPre = (buf:Buffer)=>{
        const table = ref.alloc('int32').ref() // 定义指向Buffer地址的指针，Buffer尽量定义长一点
        const length = ref.alloc('int')
        versionDLL.VerQueryValueA(buf, '\\VarFileInfo\\Translation', table, length);
        const tableBuffer = table.deref()
        const codePage = tableBuffer.readUInt16LE(0)
        const languageID  = tableBuffer.readUInt16LE(2)

        return '\\StringFileInfo\\' + _int16Format4(codePage) + _int16Format4(languageID) + '\\';
    } 


    // 获取文件属性
    const getFileVersionInfo = (path)=>{
        // 转码，windows使用AnsiChar，利用iconv-lite使用gb2312解码
        const file = iconvlite.encode(path,'gb2312')
        // 获取文件属性大小
        let size = versionDLL.GetFileVersionInfoSizeA(file,0)

        // 读取文件属性buffer
        const buf = Buffer.alloc(size || 1000);
        // @ts-ignore
        buf.type = ref.types.char;
        versionDLL.GetFileVersionInfoA(file, 0, size, buf);

        // 获取文件属性查找标记
        const pre = _getPre(buf);
        // console.log("buf and pre",buf,pre)
        
        // 读取文件属性
        // IOBS_DLL_INFO是对于dll文件信息的定义
        const fileVersionInfo:IOBS_DLL_INFO = {};
        fileVersionInfo.CompanyName = _getInfo(buf, pre, 'CompanyName');
        fileVersionInfo.FileDescription = _getInfo(buf, pre, 'FileDescription');
        fileVersionInfo.FileVersion = _getInfo(buf, pre, 'FileVersion');
        fileVersionInfo.InternalName = _getInfo(buf, pre, 'InternalName');
        fileVersionInfo.LegalCopyright = _getInfo(buf, pre, 'LegalCopyright');
        fileVersionInfo.LegalTrademarks = _getInfo(buf, pre, 'LegalTrademarks');
        fileVersionInfo.OriginalFilename = _getInfo(buf, pre, 'OriginalFilename');
        fileVersionInfo.ProductName = _getInfo(buf, pre, 'ProductName');
        fileVersionInfo.ProductVersion = _getInfo(buf, pre, 'ProductVersion');
        fileVersionInfo.Comments = _getInfo(buf, pre, 'Comments');
        return fileVersionInfo;
    }

    return {
        getFileVersionInfo
    }

}


export  {FileVersion}
