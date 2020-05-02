import React, {useState, useEffect} from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import {firebase} from './AuthConfig';
import { Editor} from 'react-draft-wysiwyg';
import { EditorState, convertToRaw, convertFromRaw} from 'draft-js';
import 'react-draft-wysiwyg/dist/react-draft-wysiwyg.css';
import {AddCacheEntry, RemoveCacheEntry} from './Cache';
const axios = require('axios').default;


function Profile(props)
{
    const {setLogin, login}= props;
    const [form, setForm] = useState('home');
    const logout = ()=>{
        firebase.auth().signOut().then(_=>{
            setLogin('');
        });
    }
    const [myposts, setMyposts] = useState([]);
    const [myreplies, setMyreplies] = useState([]);
    const [mycomments, setMyComments] = useState([]);
    const [selected, setSelected] = useState('');
    const [loading, setLoading] = useState(false);

    const refreshPosts = ()=>{
        setLoading(true)
        axios.get('https://us-central1-burghindian.cloudfunctions.net/allPosts').then(res=>{
            let postobj = res.data;
            let userposts = Object.keys(postobj).filter(x=>postobj[x].owner === login).map(x=>({...postobj[x], postid:x}));
            setMyposts(userposts)
            setLoading(false);
        })
    }
    const myPostsSelected  = (postid)=>{
        setSelected(postid);
        setForm('new-post');
    };
    const deletePosts = ()=>{
        setSelected('');
        refreshPosts();
    }

    useEffect(()=>{
        refreshPosts();
    },[]);
    return (
        <>
            <div className="row">
                <div className="col-10">
                    <nav>
                        <ol className="breadcrumb">
                            <li className={form==='home' ? 'breadcrumb-item active' : 'breadcrumb-item'}><span onClick={e=>setForm('home')} style={{cursor:"pointer"}}>My Posts</span></li>
                            <li className={form==='new-post' ? 'breadcrumb-item active' : 'breadcrumb-item'}>
                                <span onClick={e=>setForm('new-post')} style={{cursor:"pointer"}}>{selected.length === 0 ? 'New Post' : selected}</span>
                            </li>
                            <li className="breadcrumb-item">
                                <button className="btn-info button-small" onClick={e=>logout()}>Sign out</button>
                            </li>
                            {loading && <li className="ml-3"><span className="spinner-border spinner-border-sm"></span> loading ...</li>}
                        </ol>
                    </nav>
                    
                </div>
            </div>
            {form === 'home' && <MyPosts login={login} myposts={myposts} myreplies={myreplies} mycomments={mycomments} setSelected={myPostsSelected} selected={selected} 
            deletePosts={deletePosts} />}
            {form === 'new-post' && <NewPost  login={login} refreshPosts={refreshPosts} selected={selected} setSelected={setSelected} setLoading={setLoading} />}
        </>
    )
}
function NewPost(props){
    let def={header:'', trigger:false, postid:'', post:{}, files:{}, posttype:'regular'};
    const {login, refreshPosts, selected, setSelected, setLoading} = props;
    const[form,setForm] = useState(def);
    const[spinner, setSpinner] = useState(false);
    const [wygState, setwygState] = useState(EditorState.createEmpty());
    const [prop, setProp] = useState({});
    const clearForm = ()=>{
        if(form.posttype === 'regular')
            setwygState(EditorState.createEmpty())
        else
            setProp({});
        setForm(def);
        setSelected('');
    }
    const editorStateChg = newstate=>{
        setwygState(newstate);
        setForm({...form, post:JSON.stringify(convertToRaw(wygState.getCurrentContent()))});
    }
    const setFormWithProp = (newprop)=>{
        setForm({...form, post:newprop});
        setProp(newprop);
    }
    const savepost=()=>{
        setForm({...form, trigger:true});
        if(form.header.length > 0){
            setSpinner(true);
            
            if(form.postid.length > 0)
                RemoveCacheEntry(form.postid);

            const uploadfiles = new Promise(async (resolve, reject)=>{
                const cloneFilesList = (linklist)=>{
                    let keys = Object.keys(form.files);
                    let linkKeys = Object.keys(linklist);
                    let cloneObj = {};
                    for(let i = 0; i < keys.length; i++){
                        if(form.files[keys[i]].status === 'New' && !form.files[keys[i]].active)
                            continue;
                        if(form.files[keys[i]].status === 'New' && form.files[keys[i]].active){
                            let matchlink = linkKeys.find(x=>x.indexOf(keys[i]) > -1);    
            
                            cloneObj[keys[i]] = {...form.files[keys[i]], status:'Upload', link:linklist[matchlink]};
                            delete cloneObj[keys[i]].blob;
                        }
                        else
                            cloneObj[keys[i]] = {...form.files[keys[i]]};
                    }
                    return cloneObj;
                }

                const formData = new FormData();
                let noempty = false;
                let aryKeys = Object.keys(form.files);
                for(let i = 0; i < aryKeys.length; i++){
                    if(form.files[aryKeys[i]].active && form.files[aryKeys[i]].status === 'New'){
                        formData.append(form.files[aryKeys[i]].name, form.files[aryKeys[i]].blob);
                        noempty = true;
                    }
                }
                if(noempty)
                {
                    fetch('https://us-central1-burghindian.cloudfunctions.net/upLoadFiles', {body:formData, method:'POST'})
                    .then(response=>response.json())
                    .then(data=>{
                        
                        let newObj = cloneFilesList(data.uploadfiles);
                        resolve(newObj);
                    }).catch(err=>{
                        debugger;
                        reject(err);
                    })
                }
                else
                    resolve({...form.files})
            });

            uploadfiles.then(allfiles=>{
                let data = {header:form.header,owner:login, post:form.post, posttype:form.posttype, files:allfiles};
                if(form.postid.length > 0)
                    data['postid'] = form.postid;
                
                setLoading(true);
                axios.post('https://us-central1-burghindian.cloudfunctions.net/createPost', data)
                    .then(postjson=>{
                        setForm({...form, trigger:false, postid:postjson.data.postid, files:allfiles});
                        setSpinner(false);
                        refreshPosts();
                    }).catch(reason=>{
                        console.log(reason);
                        setSpinner(false);
                    });
            });
        }
    }
    useEffect(()=>{
        if(selected.length > 0){
            //get post
            AddCacheEntry(()=>{
                return axios.get(`https://us-central1-burghindian.cloudfunctions.net/showPost?postid=${selected}`)
            }, selected).then(res=>{
                let posttype = res.data.posttype ? res.data.posttype : 'regular';
                setForm({...form, header:res.data.header, postid:selected, files:res.data.files, post:res.data.post, posttype});
                if(res.data.post && Object.keys(res.data.post).length > 0 && posttype === 'regular')
                    setwygState( EditorState.createWithContent(convertFromRaw(JSON.parse(res.data.post))));
                if(res.data.post && Object.keys(res.data.post).length > 0 && posttype === 'accom')
                    setProp(res.data.post)
            });
        }
    },[]);

    return (
        <div className="row">
            <div className="col-11">
                <div className="input-group mb-1">
                    {!(form.posttype === 'regular' && form.postid.length > 0) && <div className="input-group-prepend h-50">
                        <span className="input-group-text">Is it for Accommodation</span>
                        <div className="input-group-text"><input type="checkbox" checked={form.posttype === 'accom'} 
                            onChange={e=>setForm({...form, posttype:e.target.checked ? 'accom' : 'regular'})} /></div>
                    </div>}
                </div>

                <div className="input-group mb-3 mt-3">
                    <div className="input-group-prepend"><span className="input-group-text">Header</span></div>
                    <input type="text"  className={"form-control " + (form.header.length === 0 && form.trigger ? " is-invalid" : "")}
                    value={form.header} onChange={e=>setForm({...form, header:e.target.value})}></input>
                </div>

                {form.posttype === 'regular' && <Editor editorState={wygState} wrapperClassName="card" editorClassName="card-body wysiwyg editor-images" onEditorStateChange={editorStateChg} />}
                {form.posttype !== 'regular' && <Accomidation prop={prop} setProp={setFormWithProp} />}

                <ManageFiles files={form.files} setFiles={files=>setForm({...form, files})}/>

                <div style={{textAlign:"left"}} className="mt-3">
                    <button  onClick={e=>savepost()} className="btn-info btn-sm">
                    {spinner && <span className="spinner-border spinner-border-sm"></span>}{form.postid.length > 0 ? 'Update' : 'Create'}
                    </button>
                    <button  onClick={e=>clearForm()} className="btn-danger btn-sm ml-3">Clear</button>
                </div>
                
            </div>
        </div>
    )
}
function ManageFiles(props){
    const {files, setFiles} = props;
    
    const SelecUploadFiles = list =>{
        let obj = {};
        for(let i = 0; i < list.length; i++)
            obj[list[i].name] = {name:list[i].name, link:'', blob:list[i], size:list[i].size, active:true, status:'New', stamp:Number(new Date())};
        setFiles({...files, ...obj});
    };
    const UplodFileChange = (key, nprops) =>{
        setFiles({...files, [key]:{...files[key], ...nprops}})
    }
    return (<div style={{textAlign:"left"}} className="mt-3">
        <div className="input-group mb-1">
            <div className="input-group-prepend"><span className="input-group-text">upload files</span></div>
            <input type="file" id="fileupload" onChange={e=>SelecUploadFiles(e.target.files)} multiple="multiple" />
        </div>
        <div className="mt-3">
            <table className="table table-sm table-striped">
                <thead>
                    <tr><th></th><th>status</th><th>Name</th></tr>
                </thead>
                <tbody>
                    {files && Object.keys(files).map(key=><tr key={key} style={{'opacity': files[key].active ? '1' :'.5' }}>
                        <td><input type="checkbox" checked={files[key].active} onChange={e=>UplodFileChange(key, {active:e.target.checked})} ></input></td>
                        <td>{files[key].status}</td>
                        <td>
                            {files[key].link && <a href={files[key].link} target="_blank">{files[key].name}</a>}
                            {!files[key].link && <span>{files[key].name}</span>}
                        </td>
                    </tr>)}
                </tbody>
            </table>
        </div>
    </div>);
}
function Accomidation(props){
    const {prop, setProp} = props;
    const accomtree={'Accomidation Type':['Share Room', 'Sub Lease', 'Independent Room'], 'Gender':['Male', 'Female', 'No preference'], 'Lease Type':['Long Term (6 - 12 months)','Short Term (1-6 months)','Paying Guest'],
    'House Type':['2 Bed - 2 Bath', '2 Bed - 1 Bath', '1 Bed - 1 Bath', 'Studio'],
    'Vegetarian':['Yes. Vegetarian', 'Non-veg is ok'], 'Smoking':['No Smoking', 'Smoking is Ok', 'outside only'],
    'Amenities' : ['Furnished', 'TV / Cable', 'Working Internet', 'Fitness Center'], 'Amenities2':['Swimming Pool', 'Car Park', 'Visitors Parking', 'Laundry Service']
    };
    return(
        <>
            {Object.keys(accomtree).map((x, index)=>
                
                
                <ul className="list-group list-group-horizontal-sm mb-3" key={index}>
                    <li className="list-group-item"><div className="input-group-prepend"><span className="input-group-text"><b>{x}</b></span></div></li>
                    {accomtree[x].map(item=> <li className="list-group-item" key={item}>
                        <div className="input-group">
                            <div className="input-group-prepend h-50">
                                <label className="input-group-text" htmlFor={x+index+item}>{item}</label>
                                <div className="input-group-text">
                                    <input type="checkbox" checked={!!prop[item]} onChange={e=>setProp({...prop, [item]:e.target.checked})}  name={x+index+item} id={x+index+item} />
                                </div>
                            </div>
                        </div>
                    </li>)}
                </ul>
                
            )}
        </>
    );

}
function MyPosts(props)
{
    const {myposts, myreplies,  mycomments, setSelected, selected, deletePosts, login} = props;
    const[spinner, setSpinner] = useState(false);
    const removePosts = ()=>{
        let postids = Object.keys(deletes).filter(x=>deletes[x]);
        debugger;
        if(postids.length > 0)
        {
            setSpinner(true);
            axios.post('https://us-central1-burghindian.cloudfunctions.net/deletePost', {owner:login, postids}).then(res=>{
                setSpinner(false);
                setDeletes({});
                deletePosts();
            });
        }
        
    }
    const [deletes, setDeletes] = useState({});
    return (<div className="row">
        <div className="col-11">
            <p><b>Double click on row to edit post</b></p>
            <table className="table tablle-sm table-striped mt-3 table-bordered">
                <thead><tr><th></th><th>Header</th><th>visits</th></tr></thead>
                <tbody>
                    {myposts.map(mypost=>
                    <tr onDoubleClick={e=>{setSelected(mypost.postid)}} key={mypost.postid} className={selected === mypost.postid ? "bg-light" : ""}>
                        <td><input type="checkbox" className="form-control" checked={!!deletes[mypost.postid]}  style={{height:"25px"}}
                        onChange={e=>setDeletes({...deletes, [mypost.postid]:e.target.checked})}/>
                        </td><td>{mypost.header}</td><td>{mypost.visits}</td>
                    </tr>
                    )}    
                </tbody>   
            </table>
            <div style={{textAlign:"left"}}>
                <button  onClick={e=>removePosts()} className="btn-info btn-sm">
                    {spinner && <span className="spinner-border spinner-border-sm"></span>} Remove Posts
                </button>
            </div> 

        </div>
    </div>)
}
export default Profile;