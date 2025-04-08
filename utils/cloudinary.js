const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');

cloudinary.config({
  cloud_name: 'djwp9dcgx',
  api_key: '143478372538188',
  api_secret: 'YGtR3-GbP7pZT2_3Jp8u0JirMEc'
});


const uploadProductImages = async (files) => {
    const productImages = [];
    console.log("Iam here");

    const imagesToProcess = Array.isArray(files) ? files : files?.croppedImages;

    if (!imagesToProcess || imagesToProcess.length === 0) {
        console.log('Files structure is invalid or no files to process:', files);
        return productImages;
    }

    console.log('Processing files:', imagesToProcess.length);

    for (const file of imagesToProcess) {
        try {
            if (!file.buffer) {
                console.error('No buffer found in file:', file);
                continue;
            }

            const uploadResult = await new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    {
                        folder: 'products',
                        resource_type: 'auto',
                        timeout: 60000,
                    },
                    (error, result) => {
                        if (error) {
                            console.error('Cloudinary upload error:', error);
                            reject(error);
                        } else {
                            resolve(result);
                        }
                    }
                );

                streamifier.createReadStream(file.buffer).pipe(stream);
            });

            if (uploadResult?.secure_url) {
                productImages.push(uploadResult.secure_url);
                console.log('Successfully uploaded image:', uploadResult.secure_url);
            }

        } catch (error) {
            console.error('Error uploading image:', error);
            continue;
        }
    }

    return productImages;
};


module.exports = uploadProductImages;