import React, { useState } from 'react';
import { axiosInstance } from './Tool';
import { Link, useNavigate } from 'react-router-dom'

const document = () => {
    const navigate = useNavigate();
    const [file, setFile] = useState(null);

    const onSubmit = async (e) => {
        e.preventDefault();
        if (!file) return;  // 파일이 없으면 중단

        const formData = new FormData(); // <form> 태그 기능
        formData.append('file', file);

        try {


            const response = await axiosInstance.post(`documents/img_upload`, formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                }
            );

            if (response.status === 401) {
                alert('업로드 권한이 없습니다.\n관리자로 다시 로그인 해주세요.');
                return;
            }

            // if (!response.ok) { // fetch
            //   alert('업로드에 실패했습니다.\n다시 시도해주세요.');
            //   return;
            // }
            if (response.status !== 200) {
                alert('업로드에 실패했습니다.\n다시 시도해주세요.');
                return;
            }


            // const result = await response.text(); // fetch
            const result = await response.data; // axios
            console.log('서버 응답:', result);
            //document.getElementById('panel').innerHTML = result;

        } catch (err) {
            console.error('네트워크 오류:', err);
            alert('네트워크 오류가 발생했습니다.\n다시 시도해주세요.');
        }
    };

    return (
        <form onSubmit={onSubmit} style={{ textAlign: 'center', margin: '10px' }}>
            <div id="panel" style={{ marginBottom: '10px' }}></div>
            <input type="file" onChange={(e) => setFile(e.target.files[0])} style={{ marginBottom: '10px' }}
            />
            <div>
                <button type="submit" className="btn btn-primary" style={{ marginRight: '10px' }}>
                    업로드
                </button>
            </div>
            <div style={{ marginTop: '5px' }}>
                <small>(jpg, jpeg, png 파일만 전송 가능합니다.)</small>
            </div>
        </form>
    )
}

export default document
