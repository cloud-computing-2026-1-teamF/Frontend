const BASE_URL = 'https://api.sanggwon-ai.com/v1';

export const getUserInfo = async (accessToken:string) => {
    console.log("getUserInfo start");
    const res = await (await fetch(`${BASE_URL}/v1/auth/me`, {
        method: 'GET',
        headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json"
        }
    })).json();
    console.log(res.data);
    return res.data;
}

export const loginRequest = async (email:string, password:string) => {
    console.log("login start");
    const res = await (await fetch(`${BASE_URL}/v1/auth/login`, {
        method: 'POST',
        body: JSON.stringify({
            email,
            password,
        })
    })).json();
    console.log(res.data);
    return res.data;
}

export const signUp = async (accessToken:string, email:string, password:string, name:string) => {
    console.log("signUp start");
    const res = await (await fetch(`${BASE_URL}/v1/auth/signup`, {
        method: 'POST',
        headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            email,
            password,
            name,
        })
    })).json();
    console.log(res);
    return res;
}

export const refresh = async () => {
    console.log('refresh start');
    const res = await (await fetch(`${BASE_URL}/v1/auth/refresh`)).json();
    console.log(res.data);
    return res.data;
}