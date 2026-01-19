import { Request, Response, NextFunction } from 'express';
import { findAllUsers, findUserByIdSafe, findUserByEmail, createUser as createUserModel, findUserById, updateUser as updateUserModel, updateUserPassword, deleteUser as deleteUserModel } from '../models/User';
import { findAllPods } from '../models/Pod';
import { UserRole } from '../types';
import bcrypt from 'bcrypt';
import { getPaginationParams } from '../utils/pagination';

const SALT_ROUNDS = 12;

/**
 * Get all users with pagination and search
 */
export async function getUsers(req: Request, res: Response, next: NextFunction) {
    try {
        const { page, limit } = getPaginationParams(req.query);
        const search = req.query.search as string | undefined;

        const { users, total } = await findAllUsers({ search, page, limit });

        res.json({
            success: true,
            requests: users,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Get single user by ID
 */
export async function getUser(req: Request, res: Response, next: NextFunction) {
    try {
        const { id } = req.params;
        const user = await findUserByIdSafe(id);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        res.json({
            success: true,
            data: user
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Create new user
 */
export async function createUser(req: Request, res: Response, next: NextFunction) {
    try {
        const { email, password, name, role, managedPodIds } = req.body;

        // Check if email already exists
        const existingUser = await findUserByEmail(email);
        if (existingUser) {
            return res.status(400).json({
                success: false,
                error: 'Email already registered'
            });
        }

        // Validate role
        if (!Object.values(UserRole).includes(role)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid role'
            });
        }

        // Validate pod IDs if provided
        if (managedPodIds && managedPodIds.length > 0) {
            const pods = await findAllPods();
            const validPodIds = pods.map(p => p.id);
            const invalidPods = managedPodIds.filter((id: string) => !validPodIds.includes(id));
            if (invalidPods.length > 0) {
                return res.status(400).json({
                    success: false,
                    error: `Invalid pod IDs: ${invalidPods.join(', ')}`
                });
            }
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        const user = await createUserModel({
            email,
            password: hashedPassword,
            name,
            role,
            managedPodIds: managedPodIds || []
        });

        res.status(201).json({
            success: true,
            data: user,
            message: 'User created successfully'
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Update existing user
 */
export async function updateUser(req: Request, res: Response, next: NextFunction) {
    try {
        const { id } = req.params;
        const { name, role, managedPodIds, password } = req.body;

        // Check if user exists
        const existingUser = await findUserById(id);
        if (!existingUser) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // Validate role if provided
        if (role && !Object.values(UserRole).includes(role)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid role'
            });
        }

        // Validate pod IDs if provided
        if (managedPodIds && managedPodIds.length > 0) {
            const pods = await findAllPods();
            const validPodIds = pods.map(p => p.id);
            const invalidPods = managedPodIds.filter((id: string) => !validPodIds.includes(id));
            if (invalidPods.length > 0) {
                return res.status(400).json({
                    success: false,
                    error: `Invalid pod IDs: ${invalidPods.join(', ')}`
                });
            }
        }

        // Update password if provided
        if (password) {
            const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
            await updateUserPassword(id, hashedPassword);
        }

        // Update user details
        const user = await updateUserModel(id, {
            name,
            role,
            managedPodIds
        });

        res.json({
            success: true,
            data: user,
            message: 'User updated successfully'
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Delete user
 */
export async function deleteUser(req: Request, res: Response, next: NextFunction) {
    try {
        const { id } = req.params;
        const currentUserId = req.user?.userId;

        // Prevent self-deletion
        if (id === currentUserId) {
            return res.status(400).json({
                success: false,
                error: 'Cannot delete your own account'
            });
        }

        // Check if user exists
        const existingUser = await findUserById(id);
        if (!existingUser) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        const deleted = await deleteUserModel(id);

        if (!deleted) {
            return res.status(500).json({
                success: false,
                error: 'Failed to delete user'
            });
        }

        res.json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Get all pods for user assignment
 */
export async function getPods(req: Request, res: Response, next: NextFunction) {
    try {
        const pods = await findAllPods();
        res.json({
            success: true,
            data: pods
        });
    } catch (error) {
        next(error);
    }
}
