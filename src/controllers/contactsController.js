import { Contact } from '../models/contactModel.js';
import createError from 'http-errors';

const formatResponse = (status, message, data = null) => ({
  status,
  message,
  ...(data && { data }),
});

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

    const filter = {};
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
    const contact = await Contact.findById(id);
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

export const createContact = async (req, res) => {
  try {
    const result = await Contact.create(req.body);
    res.status(201).json({
      status: 201,
      message: 'Contact created successfully',
      data: result,
    });
  } catch (error) {
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
    const { id } = req.params;
    const result = await Contact.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!result) {
      throw createError(404, 'Contact not found');
    }

    res.json(formatResponse(200, 'Contact updated', result));
  } catch (error) {
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
    const result = await Contact.findByIdAndDelete(id);
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
