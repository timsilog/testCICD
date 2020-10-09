<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     *
     * @return void
     */
    public function register()
    {
        //
    }

    /**
     * Bootstrap any application services.
     *
     * @return void
     */
    public function boot()
    {
        // if (env('APP_URL_FROM_REQ', false) === true && $this->app->request !== null && Str::contains($this->app->request->server->get('SCRIPT_NAME'), 'index.php')) {
        //     $server = $this->app->request->server;
        //     $app_url = ($this->app->request->isSecure() ? 'https://' : 'http://') . $server->get('HTTP_HOST');
        //     if ($server->get('SCRIPT_NAME') != 'index.php' && $server->get('SCRIPT_NAME') != '/index.php') {
        //         $app_url .= '/' . explode('/', $server->get('SCRIPT_NAME'))[1];
        //     }
        //     Config::set('app.url', $app_url);
        // } else {
        //     Config::set('app.url', env('APP_URL'));
        // }
    }
}
