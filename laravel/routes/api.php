<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

use App\Jobs\SendEmail;



/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| is assigned the "api" middleware group. Enjoy building your API!
|
*/

// Route::middleware('auth:api')->get('/user', function (Request $request) {
//     return $request->user();
// });

Route::get('test', function () {
    // If the Content-Type and Accept headers are set to 'application/json', 
    // this will return a JSON structure. This will be cleaned up later.
    return "Hello World from Tim";
});

Route::post('send', function (Request $request) {
    $email = $request->input('email');
    SendEmail::dispatch($email);
    return $request->input('email');
});

Route::post('hello', function () {
    return "Hello this works";
});
