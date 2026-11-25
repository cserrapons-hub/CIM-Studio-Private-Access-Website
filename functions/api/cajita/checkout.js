import {handleCajita} from '../../../server/cajita.js';

export const onRequest=({request,env})=>handleCajita(request,env);
