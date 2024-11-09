
/**
 * Error fetching embeddings from Gemini: Error: Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.
 * The error message you're encountering indicates that your Google Cloud Gemini API is failing to authenticate due to missing or misconfigured credentials. 
 * we first go to the this  link -> https://cloud.google.com/docs/authentication/provide-credentials-adc#local-dev
 * // at the last of thsi link  Creating a service account key. we clicked on it
 * then  we click on the enable the api and we enable the api that is wit hthe DocDecode
 */
/**
 *
 * we have to downlaod the cli for the authentication at local 
 * https://www.youtube.com/watch?v=rpmOM5jJJfY
 * C:\Users\Rahul\AppData\Local\Google\Cloud SDK this is the defaullt path of the cli
 * 
 */
//follow these doc insted -> https://cloud.google.com/docs/authentication/provide-credentials-adc
//NOTE - this is the video we follow for the resolve error => invalid scope => https://www.youtube.com/watch?v=BKT1CyXrfks
// NOTE - these are the doc we follow for the resolve the error -> https://ai.google.dev/gemini-api/docs/oauth
//NOTE we will try to find iout the embeddings like =>  the https://ai.google.dev/gemini-api/docs/embeddings 
import {GoogleGenerativeAI } from "@google/generative-ai";
import { AxiosError } from "axios";
// Check if the API key exists
if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY environment variable is missing.");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string)
export const gemini  = {
  async getEmbeddings(text: string): Promise<number[]>{
    try {
      const model = genAI.getGenerativeModel({model:"text-embedding-004"});
      // we pass the text by the user enter in the prompt 
      const result = await model.embedContent(text)
    // Extract embeddings from the result
    const embedding = result?.embedding?.values;
    if (!embedding) {
      throw new Error("Failed to retrieve embeddings.");
    }
    //console.log("Embedding values:", embedding);
    return embedding;
  } catch (error) {
    const axiosError = error as AxiosError;
    if (axiosError.response) {
      console.error("Error fetching embedding from Gemini API:", axiosError.response.data);
    } else {
      //console.error("Request failed:", error);
    }
    throw new Error("Failed to generate embedding.");
  }
},
};


/**
 * google cloud cli 
 * Welcome to the Google Cloud CLI! Run "gcloud -h" to get the list of available commands.
---

C:\Users\Rahul\AppData\Local\Google\Cloud SDK>gcloud init
Welcome! This command will take you through the configuration of gcloud.

Your current configuration has been set to: [default]

You can skip diagnostics next time by using the following flag:
  gcloud init --skip-diagnostics

Network diagnostic detects and fixes local network connection issues.
Checking network connection...done.
Reachability Check passed.
Network diagnostic passed (1/1 checks passed).

You must sign in to continue. Would you like to sign in (Y/n)?  y

Your browser has been opened to visit:

    https://accounts.google.com/o/oauth2/auth?response_type=code&client_id=32555940559.apps.googleusercontent.com&redirect_uri=http%3A%2F%2Flocalhost%3A8085%2F&scope=openid+https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fuserinfo.email+https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fcloud-platform+https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fappengine.admin+https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fsqlservice.login+https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fcompute+https%3A%2F%2Fwww.googleapis.com%2Fauth%2Faccounts.reauth&state=GrIEKrmHuTh7ROJTR7sHz6jncKCwej&access_type=offline&code_challenge=iLj_oRyMyEk6l-dGpK3H-52DSMsRVJMCHB9-GAdB7VQ&code_challenge_method=S256

You are signed in as: [rahulgotharwal877@gmail.com].

Pick cloud project to use:
 [1] blogweb-f30cb
 [2] dynamic-shift-412014
 [3] graphite-buffer-439917-f9
 [4] shriganeshfabrics
 [5] uber-clone-411515
 [6] Enter a project ID
 [7] Create a new project
Please enter numeric choice or text value (must exactly match list item):  dynamic-shift-412014

Your current project has been set to: [dynamic-shift-412014].

Not setting default zone/region (this feature makes it easier to use
[gcloud compute] by setting an appropriate default value for the
--zone and --region flag).
See https://cloud.google.com/compute/docs/gcloud-compute section on how to set
default compute region and zone manually. If you would like [gcloud init] to be
able to do this for you the next time you run it, make sure the
Compute Engine API is enabled for your project on the
https://console.developers.google.com/apis page.

Created a default .boto configuration file at [C:\Users\Rahul\.boto]. See this file and
[https://cloud.google.com/storage/docs/gsutil/commands/config] for more
information about configuring Google Cloud Storage.
The Google Cloud CLI is configured and ready to use!

* Commands that require authentication will use rahulgotharwal877@gmail.com by default
* Commands will reference project `dynamic-shift-412014` by default
Run `gcloud help config` to learn how to change individual settings

This gcloud configuration is called [default]. You can create additional configurations if you work with multiple accounts and/or projects.
Run `gcloud topic configurations` to learn more.

Some things to try next:

* Run `gcloud --help` to see the Cloud Platform services you can interact with. And run `gcloud help COMMAND` to get help on any gcloud command.
* Run `gcloud topic --help` to learn about advanced features of the CLI like arg files and output formatting
* Run `gcloud cheat-sheet` to see a roster of go-to `gcloud` commands.

C:\Users\Rahul\AppData\Local\Google\Cloud SDK>gcloud auth application-default print-access-token
WARNING: Compute Engine Metadata server unavailable on attempt 1 of 3. Reason: timed out
WARNING: Compute Engine Metadata server unavailable on attempt 2 of 3. Reason: timed out
WARNING: Compute Engine Metadata server unavailable on attempt 3 of 3. Reason: timed out
ERROR: (gcloud.auth.application-default.print-access-token) Your default credentials were not found. To set up Application Default Credentials, see https://cloud.google.com/docs/authentication/external/set-up-adc for more information.

C:\Users\Rahul\AppData\Local\Google\Cloud SDK>gcloud auth application-default login
Your browser has been opened to visit:

    https://accounts.google.com/o/oauth2/auth?response_type=code&client_id=764086051850-6qr4p6gpi6hn506pt8ejuq83di341hur.apps.googleusercontent.com&redirect_uri=http%3A%2F%2Flocalhost%3A8085%2F&scope=openid+https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fuserinfo.email+https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fcloud-platform+https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fsqlservice.login&state=qH5ePxQC0F1ZGeDELT6l5y3x0i6EkM&access_type=offline&code_challenge=N0YY6_wiumHpJ9cCunyC1mVLF4bhR1NZWnJrXgEeLzk&code_challenge_method=S256


Credentials saved to file: [C:\Users\Rahul\AppData\Roaming\gcloud\application_default_credentials.json]

These credentials will be used by any library that requests Application Default Credentials (ADC).

Quota project "dynamic-shift-412014" was added to ADC which can be used by Google client libraries for billing and quota. Note that some services may still bill the project owning the resource.

C:\Users\Rahul\AppData\Local\Google\Cloud SDK>gcloud auth application-default print-access-token
ya29.a0AeDClZBRBM170JyWXhpvkGSXYcuqNzhGvR3ncnyuku1w6Bx6mmCs9hxIwmC3nPd4S5Eka95luTSRL9BGZ2DvnkCtQ84ZrxspQAVG5R2htVd4HMA26x9CkxS17-MfkHyBEpBuF9RdORy0kSvLrGP5v-8OzeEZ1icC2d5EMfniaCgYKAZ8SARMSFQHGX2Mitu50b-FcMhW240gq0-q1Gg0175

C:\Users\Rahul\AppData\Local\Google\Cloud SDK>gcloud config set project dynamic-shift-412014
Updated property [core/project].

C:\Users\Rahul\AppData\Local\Google\Cloud SDK>

 */

//for checking the taht auth credatiannitals we are creting are working or not
/***
 * import axios, { AxiosError } from "axios";
import { GoogleAuth } from "google-auth-library";

export const gemini = {
  async getEmbeddings(text: string) {
    try {
      // Initialize GoogleAuth to get an OAuth2 access token
      const auth = new GoogleAuth({
        scopes: ["https://www.googleapis.com/auth/cloud-platform"],
      });
      const client = await auth.getClient();
      const token = await client.getAccessToken();

      const response = await axios.post(
        process.env.GEMINI_API_URL || "",
        { text },
        {
          headers: {
            Authorization: `Bearer ${token}`, // Use the obtained OAuth token
            "Content-Type": "application/json",
          },
        }
      );

      console.log("Response from Gemini:", response.data);

      const embeddings = response.data.embedding;
      if (!embeddings) {
        throw new Error("Embeddings not found in Gemini API response.");
      }

      console.log("Embeddings:", embeddings);
      return embeddings;
    } catch (error) {
      const axiosError = error as AxiosError;
      if (axiosError.response) {
        console.error("Error fetching embeddings from Gemini:", axiosError.response.data);
      } else {
        console.error("Error fetching embeddings from Gemini:", error);
      }
      throw new Error("Failed to generate embeddings.");
    }
  },
};

 */