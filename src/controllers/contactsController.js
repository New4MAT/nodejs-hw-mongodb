import { Contact } from '../models/contactModel.js';
import createError from 'http-errors';
import { formatResponse } from '../utils/formatResponse.js';
import { uploadImage } from '../services/cloudinary.js';
import fs from 'fs/promises';

export const getContacts = async (req, res) => {
  try {
    const {
      page = 1,
      perPage = 10,
      sortBy = 'name',
      sortOrder = 'asc',
      contactType,
      isFavourite,
    } = req.query;

    const filter = { userId: req.user._id };
    if (contactType) filter.contactType = contactType;
    if (isFavourite) filter.isFavourite = isFavourite === 'true';

    const sortOptions = {
      [sortBy]: sortOrder === 'asc' ? 1 : -1,
    };

    const itemsPerPage = Math.min(Number(perPage), 100);
    const currentPage = Math.max(Number(page), 1);

    const [contacts, total] = await Promise.all([
      Contact.find(filter)
        .sort(sortOptions)
        .skip((currentPage - 1) * itemsPerPage)
        .limit(itemsPerPage),
      Contact.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / itemsPerPage);

    res.json({
      status: 200,
      message: 'Contacts retrieved successfully!',
      data: {
        data: contacts,
        page: currentPage,
        perPage: itemsPerPage,
        totalItems: total,
        totalPages,
        hasPreviousPage: currentPage > 1,
        hasNextPage: currentPage < totalPages,
      },
    });
  } catch (error) {
    throw createError(500, 'Failed to retrieve contacts', {
      details: error.message,
    });
  }
};

export const getOneContact = async (req, res) => {
  try {
    const { id } = req.params;
    const contact = await Contact.findOne({ _id: id, userId: req.user._id });
    if (!contact) {
      throw createError(404, 'Contact not found');
    }
    res.json(formatResponse(200, 'Contact found', contact));
  } catch (error) {
    if (error.status === 404) throw error;
    throw createError(500, 'Failed to retrieve contact', {
      details: error.message,
    });
  }
};

export const createContact = async (req, res, next) => {
  try {
    console.log('=== CREATE CONTACT STARTED ===');
    console.log('📝 Request body:', JSON.stringify(req.body, null, 2));
    console.log(
      '📁 File received:',
      req.file
        ? {
            originalname: req.file.originalname,
            size: req.file.size,
            mimetype: req.file.mimetype,
            path: req.file.path,
          }
        : 'No file',
    );

    let photoUrl = null;

    if (req.file) {
      try {
        console.log('☁️ Starting image upload...');
        photoUrl = await uploadImage(req.file.path);
        console.log('✅ Image uploaded successfully:', photoUrl);
      } catch (uploadError) {
        console.error('❌ Image upload failed:', uploadError.message);
        try {
          await fs.unlink(req.file.path);
          console.log('✅ Temporary file cleaned up');
        } catch (unlinkError) {
          console.warn('⚠️ Cleanup failed:', unlinkError.message);
        }
        throw createError(500, 'Failed to upload image');
      }
    }

    console.log('💾 Creating contact in database...');
    const contactData = {
      ...req.body,
      photo: photoUrl,
      userId: req.user._id,
    };
    console.log('📋 Contact data:', contactData);

    const result = await Contact.create(contactData);
    console.log('✅ Contact created successfully:', result._id);

    res.status(201).json({
      status: 201,
      message: 'Contact created successfully',
      data: result,
    });
  } catch (error) {
    console.error('🔥 CREATE CONTACT ERROR:', error.message);
    console.error('Error stack:', error.stack);

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((err) => ({
        field: err.path,
        message: err.message,
      }));
      throw createError(400, 'Validation failed', { errors });
    }

    throw createError(500, 'Failed to create contact', {
      details: error.message,
    });
  }
};

export const updateContactById = async (req, res) => {
  try {
    console.log('=== UPDATE CONTACT STARTED ===');
    console.log('📝 Request params:', req.params);
    console.log('👤 User ID:', req.user._id);
    console.log('📦 Request body:', JSON.stringify(req.body, null, 2));
    console.log(
      '📁 File received:',
      req.file
        ? {
            originalname: req.file.originalname,
            size: req.file.size,
            mimetype: req.file.mimetype,
            path: req.file.path,
          }
        : 'No file',
    );

    const { id } = req.params;
    let updateData = { ...req.body };

    if (req.file) {
      console.log('🔍 Checking file accessibility...');
      try {
        const fileStats = await fs.stat(req.file.path);
        console.log('✅ File stats:', {
          size: fileStats.size,
          isFile: fileStats.isFile(),
          readable: true,
        });

        if (fileStats.size === 0) {
          console.log('❌ File is empty');
          throw createError(400, 'Uploaded file is empty');
        }

        console.log('☁️ Starting Cloudinary upload...');
        const photoUrl = await uploadImage(req.file.path);
        console.log('✅ Cloudinary upload successful:', photoUrl);

        updateData.photo = photoUrl;

        try {
          await fs.unlink(req.file.path);
          console.log('✅ Temporary file deleted');
        } catch (unlinkError) {
          console.warn('⚠️ Failed to delete temp file:', unlinkError.message);
        }
      } catch (fileError) {
        console.error('❌ File processing error:', fileError.message);
        if (req.file?.path) {
          try {
            await fs.unlink(req.file.path);
          } catch (unlinkError) {
            console.warn('Cleanup failed:', unlinkError.message);
          }
        }
        throw createError(500, 'Failed to process uploaded file');
      }
    }

    console.log('💾 Updating contact in database...');
    console.log('📋 Final update data:', updateData);

    const result = await Contact.findOneAndUpdate(
      { _id: id, userId: req.user._id },
      updateData,
      { new: true, runValidators: true },
    );

    console.log('✅ Database update result:', result);

    if (!result) {
      console.log('❌ Contact not found or access denied');
      throw createError(404, 'Contact not found');
    }

    console.log('✅ UPDATE COMPLETED SUCCESSFULLY');
    res.json(formatResponse(200, 'Contact updated', result));
  } catch (error) {
    console.error('🔥 UPDATE ERROR:', error.message);
    console.error('Error stack:', error.stack);

    if (error.status === 404) throw error;
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((err) => ({
        field: err.path,
        message: err.message,
      }));
      throw createError(400, 'Validation failed', { errors });
    }
    throw createError(500, 'Failed to update contact', {
      details: error.message,
    });
  }
};

export const deleteContactById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await Contact.findOneAndDelete({
      _id: id,
      userId: req.user._id,
    });
    if (!result) {
      throw createError(404, 'Contact not found');
    }
    res.status(204).end();
  } catch (error) {
    if (error.status === 404) throw error;
    throw createError(500, 'Failed to delete contact', {
      details: error.message,
    });
  }
};
