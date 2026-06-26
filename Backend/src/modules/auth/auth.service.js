import jwt from 'jsonwebtoken';
import User from './auth.model.js';
import ApiError from '../../utils/ApiError.js';

const registerUser = async (userBody) => {
    if (await User.findOne({ where: { email: userBody.email } })) {
        throw new ApiError(400, 'Email already taken');
    }
    const user = await User.create(userBody);
    const token = generateToken(user.id);
    return { user, token };
};

const loginUser = async (email, password) => {
    const user = await User.findOne({ where: { email } });
    if (!user || !(await user.isPasswordMatch(password))) {
        throw new ApiError(401, 'Incorrect email or password');
    }
    const token = generateToken(user.id);
    return { user, token };
};

const generateToken = (userId) => {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
        expiresIn: '7d', // 7 days
    });
};

export default {
    registerUser,
    loginUser,
};
