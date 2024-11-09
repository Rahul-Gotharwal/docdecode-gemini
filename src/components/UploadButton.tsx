"use client";
import { useState } from "react";
import { Dialog, DialogContent, DialogTrigger } from "./ui/dialog";
import { Button } from "./ui/button";
import DropZone from "react-dropzone";
import { Cloud, File, Loader2 } from "lucide-react";
import { Progress } from "./ui/progress";
import { useToast } from "./ui/use-toast";
import { trpc } from "@/app/_trpc/client";
import { useRouter } from "next/navigation";
import { resolve } from "path";
const UploadDropZone = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [uploadProgress, SetUploadProgress] = useState<number>(0);
  const { toast } = useToast();
  const { mutate: startPolling } = trpc.getFile.useMutation({
    onSuccess: (file) => {
      router.push(`/dashboard/${file.id}`);
    },
    retry: true,
    retryDelay: 500,
  });
  const startSimulatedProgress = () => {
    SetUploadProgress(0);
    const interval = setInterval((prevProgress) => {
      SetUploadProgress((prevProgress) => {
        if (prevProgress >= 95) {
          clearInterval(interval);
          return prevProgress;
        }
        return prevProgress + 5;
      });
    }, 500);

    return interval;
  };

  return (
    <DropZone
      multiple={false}
      onDrop={async (acceptedFile) => {
        setIsLoading(true);
        const progressInterval = startSimulatedProgress();
        try {
          // Create a FormData object to send the file
          const formData = new FormData();
          formData.append("file", acceptedFile[0]);
          // Make a POST request to your backend API
          const response = await fetch("/api/s3-upload", {
            method: "POST",
            body: formData,
        
          });
        
          if (!response.ok) {
           return toast({
            title:"Something went Wrong",
            description:"Please try again later",
            variant:"destructive"
           }) ;
          }
          clearInterval(progressInterval);
          SetUploadProgress(100);
          const result = await response.json(); 
          const {key}  = result
          startPolling({key}) 
          if(!key){
            return toast({
              title:"Something went Wrong",
              description:"Please try again later",
              variant:"destructive"
             }) 
          }
          // Optionally, you can redirect or perform other actions
        } catch (error) {
          return toast({
            title:"Something went Wrong",
            description:"Please try again later",
            variant:"destructive"
          })
        }
        finally{
          setIsLoading(true);
        }
        
      }}
    >
      {({ getRootProps, getInputProps, acceptedFiles }) => (
        <div
          {...getRootProps()}
          className="border h-64 m-4 border-dashed border-gray-300 rounded-lg"
        >
          <div className="flex items-center justify-center h-full w-full">
            <label
              htmlFor="dropzone-file"
              className="flex flex-col items-center justify-center w-full h-full rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 "
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Cloud className="h-6 w-6 text-zinc-500 mb-2 " />
                <p className="mb-2 text-sm text-zinc-700">
                  <span className="font-semibold">Click to upload</span>
                  {""} or drag and drop
                </p>
                <p className="text-xs text-zinc-500">PDF(up to 4MB)</p>
              </div>
              {acceptedFiles && acceptedFiles[0] ? (
                <div className="max-w-xs bg-white flex items-center rounded-md overflow-hidden outline outline-[1px] outline-zinc-200 divide-x divide-zinc-200 ">
                  <div className="px-3 py-2 h-full grid place-items-center  ">
                    <File className="h-4 w-4 text-purple-600" />
                  </div>
                  <div className="px-3 py-2 h-full text-sm truncate ">
                    {acceptedFiles[0].name}
                  </div>
                </div>
              ) : null}
              {isLoading ? (
                <div className="w-full mt-4 max-w-xs mx-auto  ">
                  <Progress
                    indicatorColor={
                      uploadProgress === 100 ? "bg-green-500" : ""
                    }
                    value={uploadProgress}
                    className="h-1 w-full bg-zinc-200"
                  />
                  {uploadProgress === 100 ? (
                    <div className="flex gap-1 items-center justify-center text-sm text-zinc-700 text-center pt-2">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Redirecting...
                    </div>
                  ) : null}
                </div>
              ) : null}
              <input
                {...getInputProps()}
                type="file"
                id="dropzone-file"
                className="hidden"
              />
            </label>
          </div>
        </div>
      )}
    </DropZone>
  );
};

const UploadButton = () => {
  const [isOpen, SetIsOpen] = useState<boolean>(false);
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(v) => {
        if (!v) {
          SetIsOpen(v);
        }
      }}
    >
      <DialogTrigger onClick={() => SetIsOpen(true)} asChild>
        <Button>Upload PDF</Button>
      </DialogTrigger>
      <DialogContent>
        <UploadDropZone />
      </DialogContent>
    </Dialog>
  );
};

export default UploadButton;