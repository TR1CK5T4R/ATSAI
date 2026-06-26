import Joi from 'joi';

const uploadResume = {
    // Since file validation is handled by Multer (and we just check buffer/size),
    // Joi is mainly for any accompanying body data if needed in future.
    // For now, we can validate that the file exists in the request.
    // Express-validator or manual check in controller is often easier for file presence with Multer.
    // But here is a schema if we had body fields.
    body: Joi.object().keys({
        // Add any metadata fields here if required, e.g., 'title'
    }),
};

export default {
    uploadResume
};
