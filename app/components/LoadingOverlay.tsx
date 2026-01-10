import Lottie from 'lottie-react';
import loadingAnimation from '@/public/animations/loading.json'; 

export function LoadingOverlay() {
  return (
    <div className="fixed inset-0 bg-gray-700 bg-opacity-50 flex flex-col gap-0 items-center justify-center">
      <div className="w-72 h-72">
        <Lottie
          animationData={loadingAnimation}
          loop={true}
          autoplay={true}
        />
      </div>
    </div>
  );
}