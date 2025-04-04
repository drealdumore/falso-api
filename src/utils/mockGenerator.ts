import { faker } from "@faker-js/faker";

type PropertyType =
  | "string"
  | "number"
  | "boolean"
  | "Date"
  | "array"
  | "object"
  | "null"
  | "undefined"
  | "enum"
  | "any";

interface PropertyDefinition {
  name: string;
  type: PropertyType;
  isOptional: boolean;
  isArray: boolean;
  arrayType?: PropertyType;
  objectProperties?: PropertyDefinition[];
  enumValues?: string[]; // Store possible enum values
}

interface InterfaceSchema {
  name: string;
  properties: PropertyDefinition[];
}

/**
 * Parse a TypeScript interface string into a schema
 */
export function parseInterface(interfaceStr: string): InterfaceSchema {
  // Remove comments
  interfaceStr = interfaceStr.replace(/\/\/.*$/gm, "");
  interfaceStr = interfaceStr.replace(/\/\*[\s\S]*?\*\//gm, "");

  // Extract interface name
  const nameMatch = interfaceStr.match(/interface\s+(\w+)/);
  const name = nameMatch ? nameMatch[1] : "Anonymous";

  // Extract properties
  const propertiesMatch = interfaceStr.match(/{([^}]+)}/);
  if (!propertiesMatch) {
    throw new Error("Invalid interface format: could not find properties");
  }

  const propertiesStr = propertiesMatch[1];
  const propertyLines = propertiesStr
    .split(";")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const properties: PropertyDefinition[] = [];

  for (const line of propertyLines) {
    // Match property name, optional flag, and type
    const propertyMatch = line.match(/(\w+)(\?)?:\s*(.+)/);
    if (!propertyMatch) continue;

    const [, propName, optional, typeStr] = propertyMatch;

    let type: PropertyType = "any";
    let isArray = false;
    let arrayType: PropertyType | undefined = undefined;
    let objectProperties: PropertyDefinition[] | undefined = undefined;
    let enumValues: string[] | undefined = undefined;

    // Check if it's an array
    if (typeStr.includes("[]")) {
      isArray = true;
      const baseType = typeStr.replace("[]", "").trim();
      arrayType = mapTypeString(baseType);
    }
    // Check if it's a union type / enum (like 'user' | 'admin' | 'seller')
    else if (typeStr.includes("|")) {
      type = "enum";
      enumValues = parseEnumValues(typeStr);
    }
    // Check if it's an object type
    else if (typeStr.includes("{")) {
      type = "object";
      objectProperties = parseObjectProperties(typeStr);
    }
    // Regular type
    else {
      type = mapTypeString(typeStr);
    }

    properties.push({
      name: propName,
      type,
      isOptional: !!optional,
      isArray,
      arrayType,
      objectProperties,
      enumValues,
    });
  }

  return { name, properties };
}

/**
 * Parse enum values from a union type string
 */
function parseEnumValues(typeStr: string): string[] {
  // Split by | and clean up each value
  return typeStr
    .split("|")
    .map((value) => {
      // Remove quotes and trim whitespace
      value = value.trim();
      if (value.startsWith("'") && value.endsWith("'")) {
        return value.slice(1, -1);
      }
      if (value.startsWith('"') && value.endsWith('"')) {
        return value.slice(1, -1);
      }
      return value;
    })
    .filter((value) => value.length > 0);
}

/**
 * Parse object properties from a type string
 */
function parseObjectProperties(typeStr: string): PropertyDefinition[] {
  // Extract the object definition
  const objectMatch = typeStr.match(/{([^}]+)}/);
  if (!objectMatch) return [];

  const objectPropsStr = objectMatch[1];
  const propLines = objectPropsStr
    .split(";")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const properties: PropertyDefinition[] = [];

  for (const line of propLines) {
    const propMatch = line.match(/(\w+)(\?)?:\s*(.+)/);
    if (!propMatch) continue;

    const [, propName, optional, propType] = propMatch;

    properties.push({
      name: propName,
      type: mapTypeString(propType),
      isOptional: !!optional,
      isArray: false,
    });
  }

  return properties;
}

/**
 * Map TypeScript type strings to our internal type system
 */
function mapTypeString(typeStr: string): PropertyType {
  const normalizedType = typeStr.trim().toLowerCase();

  if (normalizedType.includes("string")) return "string";
  if (
    normalizedType.includes("number") ||
    normalizedType.includes("int") ||
    normalizedType.includes("float")
  )
    return "number";
  if (normalizedType.includes("boolean") || normalizedType.includes("bool"))
    return "boolean";
  if (normalizedType.includes("date")) return "Date";
  if (normalizedType.includes("null")) return "null";
  if (normalizedType.includes("undefined")) return "undefined";
  if (normalizedType.includes("any")) return "any";

  // Default to 'any' for unknown types
  return "any";
}

/**
 * Generate mock data based on the parsed interface schema
 */
export function generateMockData(schema: InterfaceSchema, count = 1): any[] {
  const results = [];

  // Determine if this is a user-related interface
  const isUserInterface =
    schema.name.toLowerCase().includes("user") ||
    schema.properties.some(
      (p) =>
        p.name.toLowerCase() === "email" && p.name.toLowerCase() === "password"
    );

  // Determine if this is a product-related interface
  const isProductInterface =
    schema.name.toLowerCase().includes("product") ||
    schema.properties.some(
      (p) =>
        (p.name.toLowerCase() === "price" ||
          p.name.toLowerCase() === "instock") &&
        p.name.toLowerCase().includes("category")
    );

  for (let i = 0; i < count; i++) {
    const item: Record<string, any> = {};

    for (const prop of schema.properties) {
      // Skip optional properties sometimes
      if (prop.isOptional && Math.random() > 0.7) {
        continue;
      }

      if (prop.isArray) {
        const arrayLength = Math.floor(Math.random() * 5) + 1;
        item[prop.name] = Array.from({ length: arrayLength }, () =>
          generateValueForType(
            prop.arrayType || "any",
            prop,
            isUserInterface,
            isProductInterface
          )
        );
      } else {
        item[prop.name] = generateValueForType(
          prop.type,
          prop,
          isUserInterface,
          isProductInterface
        );
      }
    }

    results.push(item);
  }

  return results;
}

// Update the generateValueForType function signature to include isProductInterface
function generateValueForType(
  type: PropertyType,
  prop: PropertyDefinition,
  isUserInterface = false,
  isProductInterface = false
): any {
  // Special handling for enum types
  if (type === "enum" && prop.enumValues && prop.enumValues.length > 0) {
    return faker.helpers.arrayElement(prop.enumValues);
  }

  // Special handling for product-related fields
  if (isProductInterface || prop.name.toLowerCase().includes("product")) {
    if (prop.name.toLowerCase() === "category") {
      return faker.commerce.department();
    }

    if (prop.name.toLowerCase().includes("description") && type === "string") {
      return faker.commerce.productDescription();
    }

    if (
      prop.name.toLowerCase() === "name" ||
      prop.name.toLowerCase().includes("title")
    ) {
      return faker.commerce.productName();
    }

    if (prop.name.toLowerCase().includes("material")) {
      return faker.commerce.productMaterial();
    }

    if (prop.name.toLowerCase().includes("color")) {
      return faker.color.human();
    }
  }

  // Special handling for user-related fields
  if (isUserInterface || prop.name.toLowerCase().includes("user")) {
    if (
      prop.name.toLowerCase() === "name" ||
      prop.name.toLowerCase() === "username" ||
      prop.name.toLowerCase() === "fullname"
    ) {
      return faker.person.fullName();
    }

    if (prop.name.toLowerCase().includes("firstname")) {
      return faker.person.firstName();
    }

    if (prop.name.toLowerCase().includes("lastname")) {
      return faker.person.lastName();
    }

    if (prop.name.toLowerCase() === "email") {
      return faker.internet.email();
    }

    if (
      prop.name.toLowerCase().includes("password") &&
      prop.name.toLowerCase().includes("hash")
    ) {
      // Generate a realistic looking password hash (like bcrypt)
      return `$2a$10$${faker.string.alphanumeric(53)}`;
    }

    if (prop.name.toLowerCase().includes("password")) {
      // For actual passwords (not hashes), generate a strong password
      return faker.internet.password({ length: 12 });
    }

    if (
      prop.name.toLowerCase().includes("avatar") ||
      (prop.name.toLowerCase().includes("profile") &&
        prop.name.toLowerCase().includes("image"))
    ) {
      return faker.image.avatar();
    }

    if (prop.name.toLowerCase() === "role" && type === "string") {
      return faker.helpers.arrayElement(["user", "admin", "editor", "guest"]);
    }
  }

  // For other types, use the standard generators
  switch (type) {
    case "string":
      // Use different string generators based on property name
      if (prop.name.toLowerCase() === "id") {
        return faker.string.uuid();
      }
      if (prop.name.toLowerCase().includes("name")) {
        if (isUserInterface) {
          return faker.person.fullName();
        }
        return faker.commerce.productName();
      }
      if (prop.name.toLowerCase().includes("email")) {
        return faker.internet.email();
      }
      if (prop.name.toLowerCase().includes("phone")) {
        return faker.phone.number();
      }
      if (prop.name.toLowerCase().includes("address")) {
        return faker.location.streetAddress();
      }
      if (prop.name.toLowerCase().includes("city")) {
        return faker.location.city();
      }
      if (prop.name.toLowerCase().includes("country")) {
        return faker.location.country();
      }
      if (
        prop.name.toLowerCase().includes("zip") ||
        prop.name.toLowerCase().includes("postal")
      ) {
        return faker.location.zipCode();
      }
      if (prop.name.toLowerCase().includes("url")) {
        if (
          prop.name.toLowerCase().includes("image") ||
          prop.name.toLowerCase().includes("avatar") ||
          prop.name.toLowerCase().includes("photo")
        ) {
          if (isUserInterface) {
            return faker.image.avatar();
          }
          return `https://loremflickr.com/640/480/product?random=${faker.number.int(
            100
          )}`;
        }
        return faker.internet.url();
      }
      if (
        prop.name.toLowerCase().includes("image") ||
        prop.name.toLowerCase().includes("photo")
      ) {
        if (isUserInterface) {
          return faker.image.avatar();
        }
        return `https://loremflickr.com/640/480/product?random=${faker.number.int(
          100
        )}`;
      }
      // Default string
      return faker.lorem.words(3);

    case "number":
      if (prop.name.toLowerCase() === "id") {
        return faker.number.int({ min: 1, max: 10000 });
      }
      if (prop.name.toLowerCase().includes("age")) {
        return faker.number.int({ min: 18, max: 80 });
      }
      if (
        prop.name.toLowerCase().includes("price") ||
        prop.name.toLowerCase().includes("amount")
      ) {
        return Number.parseFloat(faker.commerce.price({ min: 1, max: 1000 }));
      }
      if (prop.name.toLowerCase().includes("year")) {
        return faker.number.int({ min: 1970, max: 2023 });
      }
      // Default number
      return faker.number.float({ min: 0, max: 1000, fractionDigits: 2 });

    case "boolean":
      if (
        prop.name.toLowerCase().includes("active") ||
        prop.name.toLowerCase().includes("enabled")
      ) {
        // Make users more likely to be active
        return Math.random() > 0.2;
      }
      if (
        prop.name.toLowerCase().includes("verified") ||
        prop.name.toLowerCase().includes("confirmed")
      ) {
        // Make users more likely to be verified
        return Math.random() > 0.3;
      }
      if (
        prop.name.toLowerCase().includes("stock") ||
        prop.name.toLowerCase().includes("available")
      ) {
        // Make products more likely to be in stock than not
        return Math.random() > 0.3;
      }
      if (
        prop.name.toLowerCase().includes("featured") ||
        prop.name.toLowerCase().includes("popular")
      ) {
        // Make products less likely to be featured
        return Math.random() > 0.7;
      }
      return faker.datatype.boolean();

    case "Date":
      if (prop.name.toLowerCase().includes("created")) {
        // Created within the last year
        return faker.date.past({ years: 1 });
      }
      if (prop.name.toLowerCase().includes("updated")) {
        // Updated more recently
        return faker.date.recent({ days: 30 });
      }
      if (
        prop.name.toLowerCase().includes("expiry") ||
        prop.name.toLowerCase().includes("expiration")
      ) {
        return faker.date.future({ years: 2 });
      }
      if (prop.name.toLowerCase().includes("birth")) {
        return faker.date.birthdate();
      }
      // Default date (recent)
      return faker.date.recent();

    case "object":
      if (!prop.objectProperties) return {};

      const obj: Record<string, any> = {};
      for (const nestedProp of prop.objectProperties) {
        if (nestedProp.isOptional && Math.random() > 0.7) {
          continue;
        }

        obj[nestedProp.name] = generateValueForType(
          nestedProp.type,
          nestedProp,
          isUserInterface,
          isProductInterface
        );
      }
      return obj;

    case "null":
      return null;

    case "undefined":
      return undefined;

    case "any":
    default:
      // For 'any' type, randomly choose between string, number, boolean
      const randomType = Math.floor(Math.random() * 3);
      switch (randomType) {
        case 0:
          return faker.lorem.word();
        case 1:
          return faker.number.int(100);
        case 2:
          return faker.datatype.boolean();
      }
  }
}
