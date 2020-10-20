<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use App\Mail\EmailForQueuing;
use Mail;

class SendEmail implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $emailAddr;

    /**
     * Create a new job instance.
     *
     * @return void
     */
    public function __construct($emailAddr)
    {
        $this->emailAddr = $emailAddr;
    }

    /**
     * Execute the job.
     *
     * @return void
     */
    public function handle()
    {
        $email = new EmailForQueuing();
        Mail::to($this->emailAddr)->send($email);
    }
}
